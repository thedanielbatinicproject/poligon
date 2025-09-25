const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware za parsiranje JSON-a i cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serviranje React build datoteka
app.use(express.static(path.join(__dirname, 'dist')));

// CORS za React development - dodajemo support za credentials
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// API rute
const authRoutes = require('./server/routes/auth');
const thesesRoutes = require('./server/routes/theses');

app.use('/api/auth', authRoutes);
app.use('/api/theses', thesesRoutes);
app.get('/api/status', (req, res) => {
    res.json({
        status: 'success',
        message: 'Poslužitelj je pokrenut s React.js frontend-om!',
        timestamp: new Date().toISOString(),
        framework: 'React.js',
        backend: 'Express.js'
    });
});

app.get('/api/about', (req, res) => {
    const technologies = ['Node.js', 'Express.js', 'React.js', 'HTML5', 'CSS3', 'JavaScript', 'Webpack', 'Babel'];
    const features = [
        'React komponente',
        'Express API poslužitelj',
        'Webpack bundling',
        'Babel transpiling',
        'API rute',
        'Rukovanje greškama',
        'Responzivni dizajn'
    ];
    
    res.json({
        technologies: technologies,
        features: features,
        currentYear: new Date().getFullYear()
    });
});

// Serviranje React aplikacije za sve ostale rute
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Nešto je pošlo po zlu!' });
});

app.listen(PORT, () => {
    console.log(`Poslužitelj pokrenut na http://localhost:${PORT}`);
});

module.exports = app;