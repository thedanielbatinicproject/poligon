const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware za parsiranje JSON-a
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serviranje statičkih fajlova
app.use(express.static(path.join(__dirname, 'public')));

// Osnovne rute
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Početna',
        heading: 'Dobrodošli na Poligon',
        description: 'Ova stranica je stvorena kao početni predložak za Node.js web aplikaciju s EJS template engine-om.',
        currentYear: new Date().getFullYear()
    });
});

app.get('/about', (req, res) => {
    const technologies = ['Node.js', 'Express.js', 'EJS', 'HTML5', 'CSS3', 'JavaScript'];
    const features = [
        'EJS template renderiranje',
        'Express poslužitelj',
        'Statičke datoteke',
        'API rute',
        'Rukovanje greškama',
        'Responzivni dizajn'
    ];
    
    res.render('about', {
        title: 'O nama',
        technologies: technologies,
        features: features,
        currentYear: new Date().getFullYear()
    });
});

// API ruta
app.get('/api/status', (req, res) => {
    res.json({
        status: 'success',
        message: 'Poslužitelj je pokrenut s EJS template engine-om!',
        timestamp: new Date().toISOString(),
        templateEngine: 'EJS'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 - Stranica nije pronađena',
        currentYear: new Date().getFullYear()
    });
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