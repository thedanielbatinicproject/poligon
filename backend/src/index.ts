import express from 'express';
import session from 'express-session';
import sessionStore from './config/sessionStore';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRouter from './routes/api.routes';
import latexContentRouter from './routes/latexContent.routes';
import { setIo } from './render/onlineRenderer';
import fs from 'fs';
import passport from 'passport';
import samlStrategy from './config/saml';

// Socket.io i HTTP server import
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow frontend origin(s). When using credentials (cookies) the
// Access-Control-Allow-Origin must be an explicit origin (not '*').
// Configure allowed origins via CORS_ALLOWED_ORIGINS env var (comma separated).
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : null;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // If no origin (e.g., server-to-server or curl), allow it
    if (!origin) return callback(null, true);
    // If no allowedOrigins configured, reflect the request origin (dev friendly)
    if (!allowedOrigins) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
};

app.use(cors(corsOptions));
// Preflight handler
app.options('*', cors(corsOptions));

// Session middleware (custom store za tvoju sessions tablicu)
import CustomSessionStore from './config/customSessionStore';
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'SECRET_COOKIE_KEY_:D',
  resave: false,
  saveUninitialized: false,
  store: new CustomSessionStore(),
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 365 * 5 } // session duration set to 5 years
};
app.use(session(sessionOptions));

// Initialize Passport and use SAML strategy
app.use(passport.initialize());
app.use(passport.session());
passport.use(samlStrategy);
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user as any);
});

// Main routes
app.use('/api', apiRouter);
// Public route for external latex renderers to fetch document LaTeX content
app.use('/latex-content', latexContentRouter);

// Catch-all for undefined routes with 404 JSON responses
app.use('/auth', (req, res) => {
  res.status(404).json({ error: 'Required auth route is not accessible. Maybe try your request via /api/auth route.' });
});
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Required API route is not accessible.' });
});
app.use('/uploads', (req, res) => {
  res.status(404).json({ error: 'Required uploads route is not accessible. Maybe try your request via /api/uploads route.' });
});


// Serve static frontend in production (copied to backend/public by frontend postbuild)
try {
  const frontendPublic = path.resolve(__dirname, '..', 'public'); // backend/public
  if (fs.existsSync(frontendPublic)) {
    console.log('Serving frontend from', frontendPublic);

    // Serve static assets (hashed files) with long cache
    app.use(express.static(frontendPublic, { index: false, maxAge: '1y' }));

    // SPA fallback: for GET requests not starting with /api and not requesting a file, return index.html
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/api')) return next();
      if (path.extname(req.path)) return res.status(404).end(); // let missing assets be 404
      return res.sendFile(path.join(frontendPublic, 'index.html'));
    });
  } else {
    console.log('Frontend public not found at', frontendPublic, '- run frontend build first.');
  }
} catch (err) {
  console.warn('Error enabling static frontend serving:', err);
}


app.use('/', (req, res) => {
  res.status(404).json({ error: 'Required resource is not accessible.' });
});

// --- SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // prilagodi po potrebi
    methods: ['GET', 'POST']
  }
});

// provide io instance to modules that need to emit events (avoid circular imports)
setIo(io);

// Simple in-memory presence tracking (per-process). For multi-node deployments
// consider a shared store like Redis so presence is global.
const presenceMap: Map<string, Set<string>> = new Map(); // userId -> set of socket ids

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Registracija usera u sobu
  socket.on('register_user', (userId) => {
    try {
      // support both primitive id or object { user_id }
      const idRaw = (typeof userId === 'object' && userId && (userId as any).user_id) ? (userId as any).user_id : userId;
      if (typeof idRaw === 'undefined' || idRaw === null) return;
      const id = String(idRaw);
      // store mapping on socket so we can clean up on disconnect
      (socket as any).registeredUserId = id;
      socket.join(id);
      console.log('socket joined room for user:', id);

      // update presence map
      const set = presenceMap.get(id) || new Set<string>();
      set.add(socket.id);
      presenceMap.set(id, set);

      // notify other clients that this user is online
      io.emit('user:presence:update', { user_id: id, online: true });

      // send initial presence snapshot to the newly registered socket
      try {
        const onlineUsers: string[] = []
        for (const [uid, sockets] of presenceMap.entries()) if (sockets && sockets.size > 0) onlineUsers.push(uid)
        socket.emit('presence_init', { online: onlineUsers })
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.warn('register_user handler error', err);
    }
  });

  // Slanje poruke
  socket.on('send_message', (data) => {
    // data: { toUserId, fromUserId, message }
    io.to(data.toUserId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    try {
      const id = (socket as any).registeredUserId as string | undefined
      if (id) {
        const set = presenceMap.get(id)
        if (set) {
          set.delete(socket.id)
          if (set.size === 0) {
            presenceMap.delete(id)
            // notify all clients that this user is now offline
            io.emit('user:presence:update', { user_id: id, online: false, lastSeen: new Date().toISOString() })
          } else {
            presenceMap.set(id, set)
          }
        }
      }
    } catch (err) {
      console.warn('error cleaning up presence on disconnect', err)
    }
  });
});

// Pokreni server
server.listen(port, () => {
  console.log(`Poligon backend running on port ${port}`);
});

// Exportaj io ako trebaš koristiti u routerima
export { io };