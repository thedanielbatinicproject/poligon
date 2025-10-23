import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fileUpload from 'multer';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Example route
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Poligon backend is running.' });
});

app.listen(port, () => {
  console.log(`Poligon backend running on port ${port}`);
});
