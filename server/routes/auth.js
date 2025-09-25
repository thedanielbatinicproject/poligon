const express = require('express');
const { login, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const token = await login(username, password, rememberMe);
        
        // Set HTTP-only cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000 // 30 days or 2 hours
        };

        res.cookie('authToken', token, cookieOptions);
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: { username, role: 'admin' }
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.json({ success: true, message: 'Logout successful' });
});

// Check auth status
router.get('/status', (req, res) => {
    if (req.user) {
        res.json({ 
            authenticated: true, 
            user: { 
                username: req.user.username, 
                role: req.user.role 
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;