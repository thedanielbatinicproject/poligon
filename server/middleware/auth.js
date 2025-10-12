const db = require('../db/index');

async function requireAuth(req, res, next) {
    try {
        const sessionId = req.cookies.sessionId;
        
        if (!sessionId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized - No session' 
            });
        }
        
        const [sessions] = await db.raw(
            'SELECT session_id, user_id, session_data, last_activity, expires_at FROM sessions WHERE session_id = ? AND expires_at > NOW()',
            [sessionId]
        );
        
        if (sessions.length === 0) {
            res.clearCookie('sessionId');
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized - Invalid or expired session' 
            });
        }
        
        const session = sessions[0];
        let userData;
        try {
            userData = JSON.parse(session.session_data);
        } catch (e) {
            userData = session.session_data;
        }
        
        await db.raw(
            'UPDATE sessions SET last_activity = NOW() WHERE session_id = ?',
            [sessionId]
        );
        
        req.user = userData;
        req.sessionId = sessionId;
        next();
    } catch (error) {
        console.error('[AUTH] Session validation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during authentication' 
        });
    }
}

function requireRole(role) {
    return function(req, res, next) {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized - No user' 
            });
        }
        
        if (req.user.role !== role && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden - Insufficient permissions' 
            });
        }
        
        next();
    };
}

async function optionalAuth(req, res, next) {
    try {
        const sessionId = req.cookies.sessionId;
        
        if (!sessionId) {
            req.user = null;
            return next();
        }
        
        const [sessions] = await db.raw(
            'SELECT session_id, user_id, session_data, last_activity, expires_at FROM sessions WHERE session_id = ? AND expires_at > NOW()',
            [sessionId]
        );
        
        if (sessions.length === 0) {
            res.clearCookie('sessionId');
            req.user = null;
            return next();
        }
        
        const session = sessions[0];
        let userData;
        try {
            userData = JSON.parse(session.session_data);
        } catch (e) {
            userData = session.session_data;
        }
        
        await db.raw(
            'UPDATE sessions SET last_activity = NOW() WHERE session_id = ?',
            [sessionId]
        );
        
        req.user = userData;
        req.sessionId = sessionId;
        next();
    } catch (error) {
        console.error('[AUTH] Optional auth error:', error);
        req.user = null;
        next();
    }
}

module.exports = {
    requireAuth,
    requireRole,
    optionalAuth
};
