import express from 'express'
import session from 'express-session'
import sessionStore from './config/sessionStore'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import apiRouter from './routes/api.routes'
import authRouter from './routes/auth.routes'
import filesRouter from './routes/files.routes';
import passport from 'passport';
import samlStrategy from './config/saml';


// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;


// Middleware
app.use(morgan('dev')); // Logging middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Session middleware (custom store za tvoju sessions tablicu)
import CustomSessionStore from './config/customSessionStore';
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'SECRET_COOKIE_KEY_:D',
  resave: false,
  saveUninitialized: false,
  store: new CustomSessionStore(),

  //TODO enable secure cookie in production
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 365 * 10 } 
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


//Catch-all for undefined routes with 404 JSON responses
app.use('/auth', (req, res) => {
  res.status(404).json({ error: 'Required auth route is not accessible. Maybe try your request via /api route.' });
});
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Required API route is not accessible.' });
});
app.use('/uploads', (req, res) => {
  res.status(404).json({ error: 'Required uploads route is not accessible. Maybe try your request via /api route.' });
});
app.use('/', (req, res) => {
  res.status(404).json({ error: 'Required resource is not accessible.' });
});

app.listen(port, () => {
  console.log(`Poligon backend running on port ${port}`);
});
