const express = require('express');
const router = express.Router();


const fs = require('fs');
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, '../data/sessions.json');


const dataDir = path.dirname(SESSIONS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}


let activeSessions = new Map();

function loadSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
            const sessionsArray = JSON.parse(data);
            activeSessions = new Map(sessionsArray);

        }
    } catch (error) {
        console.error('❌ Error loading sessions:', error);
        activeSessions = new Map();
    }
}

function saveSessions() {
    try {
        const sessionsArray = Array.from(activeSessions.entries());
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsArray, null, 2));

    } catch (error) {
        console.error('❌ Error saving sessions:', error);
    }
}


loadSessions();


function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getSessionFromCookie(req) {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
        return null;
    }
    
    const session = activeSessions.get(sessionId);
    return session;
}


// Helper funkcija za učitavanje korisnika
function loadUsers() {
    try {
        const USERS_FILE = path.join(__dirname, '../data/users.json');
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.users || parsed;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [];
}

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Učitaj korisnike iz JSON baze
    const users = loadUsers();
    const user = users.find(u => u.username === username && u.password === password && u.isActive !== false);
    
    if (user) {
        const sessionId = generateSessionId();
        const sessionData = {
            sessionId,
            user: { 
                id: user.id,
                username: user.username, 
                ime: user.ime,
                prezime: user.prezime,
                role: user.role || 'user'
            },
            createdAt: new Date(),
            lastAccess: new Date()
        };
        
        activeSessions.set(sessionId, sessionData);
        saveSessions();
        
        // Ažuriraj zadnji login korisnika
        user.lastLogin = new Date().toISOString();
        try {
            const USERS_FILE = path.join(__dirname, '../data/users.json');
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        } catch (error) {
            console.error('Error updating last login:', error);
        } 
        
        
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        
        res.json({
            success: true,
            message: 'Login successful',
            user: sessionData.user
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Neispravno korisničko ime ili lozinka'
        });
    }
});


router.get('/status', (req, res) => {
    const session = getSessionFromCookie(req);
    
    if (session) {
        
        session.lastAccess = new Date();
        activeSessions.set(session.sessionId, session);
        saveSessions(); 
        

        res.json({
            success: true,
            authenticated: true,
            isAuthenticated: true,
            user: session.user
        });
    } else {
        res.json({
            success: true,
            authenticated: false,
            isAuthenticated: false,
            user: null
        });
    }
});


router.post('/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId && activeSessions.has(sessionId)) {
        activeSessions.delete(sessionId);
        saveSessions(); 
    }
    
    res.clearCookie('sessionId');
    
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

module.exports = router;