const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Konfiguracija multer-a za upload slika
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/images');
        
        // Kreiraj direktorij ako ne postoji
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generiraj jedinstveno ime datoteke
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.originalname);
        const filename = `${timestamp}_${randomString}${extension}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Provjeri da li je datoteka slika
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Samo slike su dozvoljene (JPEG, PNG, GIF, WebP, SVG)'), false);
        }
    }
});

// POST /api/upload/image - Upload slike
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nema uploadovane datoteke' });
        }

        const { thesisId, chapterId } = req.body;
        
        // Generiraj URL za sliku
        const imageUrl = `/uploads/images/${req.file.filename}`;
        
        // Opcionalno: spremi metadata o slici u bazu
        const imageMetadata = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: imageUrl,
            size: req.file.size,
            mimetype: req.file.mimetype,
            thesisId: thesisId,
            chapterId: chapterId,
            uploadedAt: new Date().toISOString()
        };

        console.log('Image uploaded:', imageMetadata);
        
        res.json({
            success: true,
            url: imageUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            metadata: imageMetadata
        });
        
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Error uploading image' });
    }
});

// GET /api/upload/images/:filename - Serviranje slika
router.get('/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads/images', filename);
    
    // Provjeri da li datoteka postoji
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).json({ error: 'Slika nije pronađena' });
    }
});

// DELETE /api/upload/images/:filename - Brisanje slike
router.delete('/images/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const imagePath = path.join(__dirname, '../uploads/images', filename);
        
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            res.json({ success: true, message: 'Slika je uspješno obrisana' });
        } else {
            res.status(404).json({ error: 'Slika nije pronađena' });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Error deleting image' });
    }
});

// Error handling middleware za multer greške
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Datoteka je prevelika (maksimalno 10MB)' });
        }
    }
    
    if (error.message === 'Samo slike su dozvoljene (JPEG, PNG, GIF, WebP, SVG)') {
        return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Neočekivana greška pri uploadu' });
});

module.exports = router;