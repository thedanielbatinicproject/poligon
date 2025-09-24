const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware za parsiranje JSON-a
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serviranje React build datoteka
app.use(express.static(path.join(__dirname, 'dist')));

// CORS za React development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// API rute
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
app.get('/*', (req, res) => {
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