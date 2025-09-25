require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Import middleware and routes
const { verifyToken } = require('./server/middleware/auth');
const authRoutes = require('./server/routes/auth');
const JsonDB = require('./server/utils/JsonDB');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new JsonDB(path.join(__dirname, 'data.json'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3001',
    credentials: true
}));

// Apply auth middleware to all routes
app.use(verifyToken);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'success',
        message: 'Poligon - Diplomski Builder je aktivan',
        timestamp: new Date().toISOString(),
        authenticated: !!req.user,
        mode: req.user ? 'EDIT' : 'VIEW'
    });
});

// Serve React application
app.use(express.static(path.join(__dirname, 'dist')));

// Catch all handler for React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Poligon server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;