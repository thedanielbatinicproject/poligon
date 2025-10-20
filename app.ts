import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import backend from './backend/src/index';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Mount backend API
app.use('/api', backend);

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend', 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
