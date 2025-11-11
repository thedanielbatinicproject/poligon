// Socket logging switch
const SOCKET_LOGGING_ENABLED = process.env.SOCKET_LOGGING_ENABLED === 'true';
function slog(...args: any[]) {
  if (SOCKET_LOGGING_ENABLED) {
    const ts = new Date().toISOString();
    console.log('[SOCKET]', ts, ...args);
  }
}
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
import { generateMetadata } from './config/saml';
import { decodeDocumentHash } from './utils/documentHash';
import { DocumentsService } from './services/documents.service';
import { ErrorTemplates } from './render/errorTemplates';

// Socket.io i HTTP server import
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';



// Error logging utility
const logError = (error: any) => {
  const timestamp = new Date().toISOString();
  const logPath = path.resolve(__dirname, '../main.log');
  const message = `[${timestamp}] ERROR: ${error?.stack || error?.message || String(error)}\n`;
  try {
    fs.appendFileSync(logPath, message);
    console.error(message);
  } catch (e) {
    console.error('Failed to write to log file:', e);
    console.error('Original error:', error);
  }
};

// Global error handlers
process.on('uncaughtException', (error) => {
  logError(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(reason);
});

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

// Trust proxy - enable if behind nginx or cloud load balancer
// This allows Express to read X-Forwarded-For and X-Real-IP headers
app.set('trust proxy', true);

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
  origin: 'https://poligon.live',
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

// CRITICAL FIX: Skip session middleware for WebSocket upgrade requests
// Session can cause blocking/timeout on WebSocket connections
const sessionMiddleware = session(sessionOptions);
app.use((req, res, next) => {
  // Skip session for WebSocket upgrade requests
  if (req.headers.upgrade === 'websocket' || req.path.startsWith('/socket.io') || req.path.startsWith('/yjs')) {
    return next();
  }
  return sessionMiddleware(req, res, next);
});

// Middleware to capture IP address and user agent in session
app.use((req, res, next) => {
  if (req.session) {
    // Get real IP address (handles proxy/localhost scenarios)
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               req.ip || 
               '127.0.0.1';
    
    // Store IP address (use first IP if comma-separated list from proxies)
    (req.session as any).ip_address = Array.isArray(ip) ? ip[0] : ip.toString().split(',')[0].trim();
    
    // Store user agent
    (req.session as any).user_agent = req.headers['user-agent'] || 'Unknown';
  }
  next();
});

// Initialize Passport and use SAML strategy
app.use(passport.initialize());
app.use(passport.session());
passport.use(samlStrategy);
passport.serializeUser((user: any, done: any) => {
  done(null, user);
});
passport.deserializeUser((user: any, done: any) => {
  done(null, user as any);
});

// SAML SP Metadata endpoint - PUBLIC, no auth required
app.get('/metadata', (req, res) => {
  try {
    const metadata = generateMetadata();
    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (err) {
    console.error('Failed to generate metadata:', err);
    res.status(500).json({ error: 'Failed to generate SAML metadata' });
  }
});

// SAML SP EntityID endpoint - PUBLIC, no auth required
app.get('/sp', (req, res) => {
  const entityID = process.env.SAML_ISSUER || `${process.env.BASE_URL || 'http://localhost:5000'}/sp`;
  res.set('Content-Type', 'text/plain');
  res.send(entityID);
});

// Public document sharing endpoint - GET /d/:hashCode
// Decodes hash, fetches latest PDF version, serves inline in browser
app.get('/d/:hashCode', async (req, res) => {
  const hashCode = req.params.hashCode;
  
  try {
    // Decode hash to get document_id
    const document_id = decodeDocumentHash(hashCode);
    
    if (!document_id) {
      return res.status(404).send(ErrorTemplates.invalidLink());
    }

    // Check if document exists
    const doc = await DocumentsService.getDocumentById(document_id);
    if (!doc) {
      return res.status(404).send(ErrorTemplates.documentNotFound(document_id));
    }

    // Get all versions for this document
    const versions = await DocumentsService.getDocumentVersions(document_id);
    
    if (!versions || versions.length === 0) {
      return res.status(404).send(ErrorTemplates.noRenders(document_id));
    }

    // Get latest version (last in array since ordered by version_number ASC)
    const latestVersion = versions[versions.length - 1];
    
    if (!latestVersion.compiled_pdf_path) {
      return res.status(404).send(ErrorTemplates.pdfNotAvailable(document_id));
    }

    // Check if PDF file actually exists on disk
    const pdfPath = path.resolve(process.cwd(), latestVersion.compiled_pdf_path);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).send(ErrorTemplates.pdfNotAvailable(document_id));
    }

    // Serve PDF inline in browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    return res.sendFile(latestVersion.compiled_pdf_path, { root: process.cwd() });
    
  } catch (err) {
    console.error('[ERROR] /d/:hashCode', err);
    return res.status(500).send(ErrorTemplates.serverError());
  }
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

// DEBUG: Log all incoming requests to see if WebSocket upgrade reaches server
app.use((req, res, next) => {
  if (req.headers.upgrade === 'websocket') {
    logSocket(`[DEBUG] WebSocket upgrade request: ${req.method} ${req.url}`);
    logSocket(`[DEBUG] Headers: ${JSON.stringify(req.headers)}`);
  }
  next();
});

// --- SOCKET.IO SETUP ---
const server = http.createServer(app);

// Log raw HTTP upgrade requests to help debug WebSocket extension negotiation
server.on('upgrade', (req, socket, head) => {
  try {
    // Remove any Sec-WebSocket-Extensions or Sec-WebSocket-Protocol forwarded by clients
    // so that the server (engine.io/ws) does not negotiate permessage-deflate via a forwarded header.
    try { delete (req.headers as any)['sec-websocket-extensions']; } catch (e) {}
    try { delete (req.headers as any)['sec-websocket-protocol']; } catch (e) {}
  } catch (e) {
    // ignore
  }
});
// Socket.io detailed logging to file
//TODO REMOVE IN PRODUCTION
const socketLogPath = path.resolve(__dirname, '../socket.log');
const logSocket = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    //fs.appendFileSync(socketLogPath, logMessage);
    console.log(logMessage.trim());
  } catch (e) {
    console.error('Failed to write socket log:', e);
  }
};

logSocket('=== Socket.io server initializing ===');

const io = new SocketIOServer(server, {
  cors: {
  origin: 'https://poligon.live',
  credentials: true,
  methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  perMessageDeflate: false,
  // Ensure websocket transport explicitly disables per-message deflate
  transportOptions: {
    websocket: {
      perMessageDeflate: false
    }
  },
  pingTimeout: 60000,
  pingInterval: 25000
} as any);

logSocket('Socket.io server created with config: ' + JSON.stringify({
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
}));

// provide io instance to modules that need to emit events (avoid circular imports)
setIo(io);

// Simple in-memory presence tracking (per-process). For multi-node deployments
// consider a shared store like Redis so presence is global.
const presenceMap: Map<string, Set<string>> = new Map(); // userId -> set of socket ids

io.on('connection', (socket) => {
  slog('Socket.IO CONNECT', socket.id, 'user-agent:', socket.handshake.headers['user-agent']);
  socket.on('disconnect', (reason) => {
    slog('Socket.IO DISCONNECT', socket.id, 'reason:', reason);
  });
  socket.on('error', (err) => {
    slog('Socket.IO ERROR', socket.id, err);
  });
  socket.conn.on('upgrade', (transport) => {
    slog('Socket.IO UPGRADE', socket.id, 'to', transport.name);
  });
  // TODO: remove logs in production - BEGIN
  logSocket(`[DEBUG SOCKET] handshake.headers.cookie: ${socket.handshake && socket.handshake.headers ? socket.handshake.headers.cookie : 'NO COOKIE'}`);
  logSocket(`[DEBUG SOCKET] handshake.auth: ${JSON.stringify(socket.handshake && socket.handshake.auth ? socket.handshake.auth : {}, null, 2)}`);
  // TODO: remove logs in production - END

  logSocket(`[CONNECTION] Client connected: ${socket.id}, transport: ${socket.conn.transport.name}, handshake: ${JSON.stringify(socket.handshake, null, 2)}`);

  // Log transport upgrades
  socket.conn.on('upgrade', (transport) => {
    logSocket(`[UPGRADE] Socket ${socket.id} upgraded to: ${transport.name}`);
  });

  // Log errors
  socket.on('error', (err) => {
    logSocket(`[ERROR] Socket ${socket.id} error: ${err && err.message ? err.message : String(err)}`);
    logSocket(`[ERROR-DETAIL] ${JSON.stringify(err, null, 2)}`);
  });

  socket.conn.on('error', (err) => {
    logSocket(`[CONN ERROR] Socket ${socket.id} connection error: ${err && err.message ? err.message : String(err)}`);
    logSocket(`[CONN ERROR-DETAIL] ${JSON.stringify(err, null, 2)}`);
  });

  socket.on('disconnecting', (reason) => {
    logSocket(`[DISCONNECTING] Socket ${socket.id} disconnecting, reason: ${reason}`);
    logSocket(`[DISCONNECTING] Socket handshake: ${JSON.stringify(socket.handshake, null, 2)}`);
  });

  socket.on('disconnect', (reason) => {
    logSocket(`[DISCONNECT] Socket ${socket.id} disconnected, reason: ${reason}`);
    logSocket(`[DISCONNECT] Socket handshake: ${JSON.stringify(socket.handshake, null, 2)}`);
  });

  // Registracija usera u sobu
  socket.on('register_user', (userId) => {
    slog('Socket.IO register_user', socket.id, 'userId:', userId);
    try {
      // support both primitive id or object { user_id }
      const idRaw = (typeof userId === 'object' && userId && (userId as any).user_id) ? (userId as any).user_id : userId;
      if (typeof idRaw === 'undefined' || idRaw === null) return;
      const id = String(idRaw);
      // store mapping on socket so we can clean up on disconnect
      (socket as any).registeredUserId = id;
      socket.join(id);
      logSocket(`[REGISTER] Socket ${socket.id} joined room for user: ${id}`);

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
      logSocket(`[ERROR] register_user handler error: ${err}`);
    }
  });

  // Slanje poruke
  socket.on('send_message', (data) => {
    slog('Socket.IO send_message', socket.id, data);
    // data: { toUserId, fromUserId, message }
    logSocket(`[MESSAGE] Socket ${socket.id} sending message to user ${data.toUserId}`);
    io.to(data.toUserId).emit('receive_message', data);
  });

  socket.on('disconnect', (reason) => {
    logSocket(`[DISCONNECT] Socket ${socket.id} disconnected, reason: ${reason}`);
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
            logSocket(`[PRESENCE] User ${id} now offline`);
          } else {
            presenceMap.set(id, set)
          }
        }
      }
    } catch (err) {
      logSocket(`[ERROR] disconnect cleanup error: ${err}`);
    }
  });
});


// [YjsWS] Disabled internal Yjs WebSocket server. Using external wss://socket.poligon.live

// Pokreni server
server.listen(port, () => {
  const msg = `Poligon backend running on port ${port}`;
  console.log(msg);
  logSocket(`=== ${msg} ===`);
}).on('error', (err) => {
  logSocket(`[FATAL] Server error: ${err}`);
  logError(err);
  process.exit(1);
});

// Exportaj io ako trebaš koristiti u routerima
export { io };