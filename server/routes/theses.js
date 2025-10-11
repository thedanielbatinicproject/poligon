const express = require('express');
const router = express.Router();
const ThesisModel = require('../models/ThesisModel');


const fs = require('fs');
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, '../data/sessions.json');

function loadActiveSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
            const sessionsArray = JSON.parse(data);
            return new Map(sessionsArray);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
    return new Map();
}

// Middleware za autentifikaciju - sada koristi cookies
const authenticateUser = (req, res, next) => {
    
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const sessionId = req.cookies.sessionId;
        
        if (!sessionId) {
            return res.status(401).json({ error: 'Authentication required - no session cookie' });
        }
        
        // Učitaj aktivne sesije iz fajla
        const activeSessions = loadActiveSessions();
        
        if (!activeSessions.has(sessionId)) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
        const sessionData = activeSessions.get(sessionId);
        req.user = sessionData.user;
        req.sessionId = sessionId;
    }
    
    next();
};


router.get('/', async (req, res) => {
    try {
        const theses = await ThesisModel.getAll();
        res.json(theses);
    } catch (error) {
        console.error('Error fetching theses:', error);
        res.status(500).json({ error: 'Error fetching theses' });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const thesis = await ThesisModel.getById(req.params.id);
        if (!thesis) {
            return res.status(404).json({ error: 'Thesis not found' });
        }
        res.json(thesis);
    } catch (error) {
        console.error('Error fetching thesis:', error);
        res.status(500).json({ error: 'Error fetching thesis' });
    }
});


router.post('/', authenticateUser, async (req, res) => {
    try {
        const thesis = await ThesisModel.create(req.body);
        res.status(201).json(thesis);
    } catch (error) {
        console.error('Error creating thesis:', error);
        res.status(500).json({ error: 'Error creating thesis' });
    }
});


router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const thesis = await ThesisModel.update(req.params.id, req.body);
        res.json(thesis);
    } catch (error) {
        console.error('Error updating thesis:', error);
        res.status(500).json({ error: 'Error updating thesis' });
    }
});


router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        await ThesisModel.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting thesis:', error);
        res.status(500).json({ error: 'Error deleting thesis' });
    }
});


router.post('/:id/chapters', authenticateUser, async (req, res) => {
    try {
        const thesis = await ThesisModel.addChapter(req.params.id, req.body);
        res.json(thesis);
    } catch (error) {
        console.error('Error adding chapter:', error);
        res.status(500).json({ error: 'Error adding chapter' });
    }
});


router.put('/:id/chapters/:chapterId', authenticateUser, async (req, res) => {
    try {
        const thesis = await ThesisModel.updateChapter(req.params.id, req.params.chapterId, req.body);
        res.json(thesis);
    } catch (error) {
        console.error('Error updating chapter:', error);
        res.status(500).json({ error: 'Error updating chapter' });
    }
});


router.delete('/:id/chapters/:chapterId', authenticateUser, async (req, res) => {
    try {
        const thesis = await ThesisModel.deleteChapter(req.params.id, req.params.chapterId);
        res.json(thesis);
    } catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ error: 'Error deleting chapter' });
    }
});

module.exports = router;
