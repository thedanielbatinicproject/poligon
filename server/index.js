const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Provjeri i kreiraj direktorij za upload ako ne postoji
const uploadDir = path.join(__dirname, '../storage', 'images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer konfiguracija za upload slika
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const userId = req.user ? req.user.id : 'unknown';
        const now = new Date();
        // Zagreb timezone offset (CET/CEST)
        const zagrebTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zagreb' }));
        const pad = n => n.toString().padStart(2, '0');
        const padMs = n => n.toString().padStart(3, '0');
        // Windows-safe format: hyphens instead of colons
        const dateStr = 
            pad(zagrebTime.getDate()) + '.' +
            pad(zagrebTime.getMonth() + 1) + '.' +
            zagrebTime.getFullYear() + '_' +
            pad(zagrebTime.getHours()) + '-' +
            pad(zagrebTime.getMinutes()) + '-' +
            pad(zagrebTime.getSeconds()) + '.' +
            padMs(zagrebTime.getMilliseconds());
        const ext = path.extname(file.originalname);
        cb(null, `img-${dateStr}-${userId}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: process.env.IMAGE_STORAGE_LIMIT * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Samo slike su dozvoljene!'), false);
        }
    }
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const passport = require('passport');
app.use(passport.initialize());

// Static fileovi
app.use(express.static(path.join(__dirname, '../dist')));
app.use(express.static(path.join(__dirname, '../public')));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', (process.env.CORS_ORIGIN+":"+process.env.PORT) || 'http://localhost:3000');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// API Rute
const authRoutes = require('./routes/auth');
const thesesRoutes = require('./routes/theses');
const tasksRoutes = require('./routes/tasks');
const notesRoutes = require('./routes/notes');
const usersRoutes = require('./routes/users');
const adminDocumentsRoutes = require('./routes/admin-documents');

app.use('/api/auth', authRoutes);
app.use('/api/theses', thesesRoutes);
app.use('/api', tasksRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin/documents', adminDocumentsRoutes);

// Upload endpoint
// TODO: Dodati integraciju sa MariaDB
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nema uploadane datoteke' 
            });
        }

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

// Health check
// TODO: Dodati provjeru spojenosti na MariaDB i detaljnije informacije o serveru i korisniku
app.get('/api/status', (req, res) => {
    res.json({
        status: 'success',
        message: 'Poslužitelj je pokrenut i radi ispravno!',
        timestamp: new Date().toISOString(),
        framework: 'React.js',
        backend: 'Express.js',
        database: 'MariaDB',
        loggedIn: req.user || 'unknown user',
    });
});


// SPA fallback - mora biti zadnji
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Multer error handler (mora biti prije generic error handler-a)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(413).json({ 
                    success: false, 
                    error: 'Datoteka je prevelika. Maksimalna veličina je 5MB.' 
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({ 
                    success: false, 
                    error: 'Previše datoteka. Dozvoljena je samo jedna datoteka.' 
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({ 
                    success: false, 
                    error: 'Neočekivano ime polja za datoteku.' 
                });
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: `Greška pri uploadu: ${err.message}` 
                });
        }
    } else if (err.message === 'Samo slike su dozvoljene!') {
        // Custom file filter error
        return res.status(400).json({ 
            success: false, 
            error: err.message 
        });
    }
    
    // Pass to generic error handler
    next(err);
});

// Generic error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(err.status || 500).json({ 
        success: false, 
        error: err.message || 'Nešto je pošlo po zlu!' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Poslužitelj pokrenut na ${process.env.CORS_ORIGIN}:${PORT}`);
});

module.exports = app;
