const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Multer konfiguracija za file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        // Kreiraj direktorij ako ne postoji
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generiraj jedinstveno ime fajla
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Dozvoli samo slike
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Samo slike su dozvoljene!'), false);
        }
    }
});

// Middleware za parsiranje JSON-a i cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serviranje React build datoteka
app.use(express.static(path.join(__dirname, 'dist')));

// Serviranje TinyMCE datoteka iz public direktorija
app.use(express.static(path.join(__dirname, 'public')));

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
const tasksRoutes = require('./server/routes/tasks');

app.use('/api/auth', authRoutes);
app.use('/api/theses', thesesRoutes);
app.use('/api', tasksRoutes);

// Upload endpoint za TinyMCE
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nema uploadane datoteke' 
            });
        }

        // Generiraj URL za pristup datoteci
        const fileUrl = `/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Greška pri uploadu datoteke' 
        });
    }
});

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