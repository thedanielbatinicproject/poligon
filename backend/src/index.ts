import express from 'express';
import session from 'express-session';
import sessionStore from './config/sessionStore';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import apiRouter from './routes/api.routes';
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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Registracija usera u sobu
  socket.on('register_user', (userId) => {
    socket.join(userId);
  });

  // Slanje poruke
  socket.on('send_message', (data) => {
    // data: { toUserId, fromUserId, message }
    io.to(data.toUserId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pokreni server
server.listen(port, () => {
  console.log(`Poligon backend running on port ${port}`);
});

// Exportaj io ako trebaš koristiti u routerima
export { io };