const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware to verify JWT token from cookies
const verifyToken = (req, res, next) => {
    const token = req.cookies?.authToken;
    
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Login function
const login = async (username, password, rememberMe = false) => {
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        throw new Error('Invalid credentials');
    }

    const duration = rememberMe ? '30d' : '2h';
    const token = jwt.sign(
        { 
            username: ADMIN_USERNAME, 
            role: 'admin',
            loginTime: Date.now()
        },
        JWT_SECRET,
        { expiresIn: duration }
    );

    return token;
};

module.exports = {
    verifyToken,
    requireAuth,
    login
};