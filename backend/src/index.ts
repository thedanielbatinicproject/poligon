import express from 'express'
import session from 'express-session'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import apiRouter from './routes/api.routes'
import authRouter from './routes/auth.routes'
import filesRouter from './routes/files.routes';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev')); // Logging middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'SECRET_COOKIE_KEY',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // za dev, za prod koristi secure: true uz HTTPS
};

// Cast to unknown first to work around duplicated @types/express instances causing incompatible types
app.use(session(sessionOptions));

// Main routes
app.use('/files', filesRouter);

app.use('/api', apiRouter);

app.use('/auth', authRouter);


//Catch-all for undefined routes with 404 JSON responses

app.use('/auth', (req, res) => {
  res.status(404).json({ error: 'Required auth route is not accessible.' });
});
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Required API route is not accessible.' });
});
app.use('/uploads', (req, res) => {
  res.status(404).json({ error: 'Required uploads route is not accessible.' });
});
app.use('/', (req, res) => {
  res.status(404).json({ error: 'Required resource is not accessible.' });
});

app.listen(port, () => {
  console.log(`Poligon backend running on port ${port}`);
});
