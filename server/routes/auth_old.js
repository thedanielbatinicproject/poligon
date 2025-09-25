const express = require('express');
const router = express.Router();

// Globalni session store koji se dijeli između zahtjeva
if (!global.activeSessions) {
    global.activeSessions = new Map();
}
const activeSessions = global.activeSessions;

// GET /api/auth/status - Provjeri status prijave
router.get('/status', (req, res) => {
    let sessionId = null;
    
    // Provjeri Authorization Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7); // Ukloni "Bearer "
    }
    
    console.log('Auth status check - Authorization header:', authHeader); // Debug log
    console.log('Auth status check - extracted sessionId:', sessionId); // Debug log
    console.log('Active sessions:', Array.from(activeSessions.keys())); // Debug log
    
    if (sessionId && activeSessions.has(sessionId)) {
        const user = activeSessions.get(sessionId);
        console.log('User found in session:', user); // Debug log
        return res.json({
            authenticated: true,
            user: user
        });
    }
    
    console.log('No valid session found'); // Debug log
    res.json({
        authenticated: false,
        user: null
    });
});

// POST /api/auth/login - Prijava
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Provjeri protiv .env varijabli
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    
    if (username === adminUsername && password === adminPassword) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const user = {
            id: 'admin',
            username: 'admin',
            email: 'admin@poligon.hr',
            role: 'admin'
        };
        
        activeSessions.set(sessionId, user);
        console.log('New session created:', sessionId, 'for user:', user.username); // Debug log
        console.log('Total active sessions:', activeSessions.size); // Debug log
        
        res.json({
            success: true,
            sessionId: sessionId,
            user: user
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
});

// POST /api/auth/logout - Odjava
router.post('/logout', (req, res) => {
    let sessionId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7);
    }
    
    if (sessionId && activeSessions.has(sessionId)) {
        activeSessions.delete(sessionId);
    }
    
    res.json({ success: true });
});

module.exports = router;
