const express = require('express');
const router = express.Router();
const passport = require('passport');
const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const db = require('../db/index');

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

passport.use(new SamlStrategy({
    entryPoint: process.env.AAIEDUHR_SAML_ENTRY_POINT || 'https://login.aaiedu.hr/simplesaml/saml2/idp/SSOService.php',
    issuer: process.env.AAIEDUHR_SAML_ISSUER || 'https://yourapp.com',
    callbackUrl: process.env.AAIEDUHR_SAML_CALLBACK_URL || 'http://localhost:3000/api/auth/callback/aaieduhr',
    idpCert: process.env.AAIEDUHR_SAML_CERT || 'MIIDXTCCAkWgAwIBAgIJALmVVuDWu4NYMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwHhcNMTYxMjI4MTkzNzQ1WhcNMjYxMjI2MTkzNzQ1WjBFMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzUCFozgNb1h1M0jzNRSCjhOBnR+uVbVpaWfXYIR+AhWDdEe5ryY+CgavOg8bfLybyzFdehlYdDRgkedEB/GjG8aJw06l0qF4jDOAw0kEygWCu2mcH7XOxRt+YAH3TVHa/Hu1W3WjzkobqqqLQ8gkKWWM27fOgAZ6GieaJBN6VBSMMcPey3HWLBmc+TYJmv1dbaO2jHhKh8pfKw0W12VM8P1PIO8gv4Phu/uuJYieBWKixBEyy0lHjyixYFCR12xdh4CA47q958ZRGnnDUGFVE1QhgRacJCOZ9bd5t9mr8KLaVBYTCJo5ERE8jymab5dPqe5qKfJsCZiqWglbjUo9twIDAQABo1AwTjAdBgNVHQ4EFgQUxpuwcs/CYQOyui+r1G+3KxBNhxkwHwYDVR0jBBgwFoAUxpuwcs/CYQOyui+r1G+3KxBNhxkwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAAiWUKs/2x/viNCKi3Y6blEuCtAGhzOOZ9EjrvJ8+COH3Rag3tVBWrcBZ3/uhhPq5gy9lqw4OkvEws99/5jFsX1FJ6MKBgqfuy7yh5s1YfM0ANHYczMmYpZeAcQf2CGAaVfwTTfSlzNLsF2lW/ly7yapFzlYSJLGoVE+OHEu8g09zSvjRM2dhNLiCcKJi3sJc1iztz1uIm0BaNJAr5Z3VpLScVo8VkgO/pLL2jrKJRZ1m5BkVYdgLs8SLJr3GPDWJLMVyxf8SBCbJWf1M+5SXkz0BtFPd+VxLdVV7Z6JmZhfLMJDI4CfPE7I5T+N7vGx1O4rZkm1b0+XLFXMxDnHFKw==',
    identifierFormat: null,
    signatureAlgorithm: 'sha256',
    wantAssertionsSigned: false
}, async (profile, done) => {
    try {
        const email = profile.email || profile['urn:oid:0.9.2342.19200300.100.1.3'] || profile.nameID;
        let firstName = profile.givenName || profile['urn:oid:2.5.4.42'] || '';
        let lastName = profile.sn || profile['urn:oid:2.5.4.4'] || '';
        
        if (!firstName || firstName.trim() === '') {
            firstName = 'Nepoznato';
        }
        if (!lastName || lastName.trim() === '') {
            lastName = 'Ime';
        }
        
        const affiliation = profile.eduPersonAffiliation || profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.1'] || '';
        let role = 'user';
        
        if (Array.isArray(affiliation)) {
            if (affiliation.includes('faculty') || affiliation.includes('staff')) {
                role = 'mentor';
            } else if (affiliation.includes('student')) {
                role = 'student';
            }
        } else if (typeof affiliation === 'string') {
            if (affiliation.includes('faculty') || affiliation.includes('staff')) {
                role = 'mentor';
            } else if (affiliation.includes('student')) {
                role = 'student';
            }
        }
        
        const [existingUsers] = await db.raw(
            'SELECT user_id, first_name, last_name, email, role, preferred_language FROM users WHERE email = ?',
            [email]
        );
        
        let user;
        if (existingUsers.length === 0) {
            const [result] = await db.raw(
                `INSERT INTO users (first_name, last_name, email, role, preferred_language, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, 'hr', NOW(), NOW())`,
                [firstName, lastName, email, role]
            );
            
            user = {
                user_id: result.insertId,
                first_name: firstName,
                last_name: lastName,
                email: email,
                role: role,
                preferred_language: 'hr'
            };
        } else {
            user = existingUsers[0];
        }
        
        done(null, user);
    } catch (error) {
        console.error('AAI@EduHr authentication error:', error);
        done(error);
    }
}));

router.get('/login/aaieduhr', passport.authenticate('saml', { failureRedirect: '/login', failureFlash: true }));

router.post('/callback/aaieduhr', 
    passport.authenticate('saml', { failureRedirect: '/login', failureFlash: true }),
    async (req, res) => {
        try {
            const user = req.user;
            
            const sessionId = generateSessionId();
            const sessionData = {
                user_id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            };
            
            await db.raw(
                `INSERT INTO sessions (session_id, user_id, session_data, expires_at, created_at, last_activity) 
                 VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW())`,
                [sessionId, user.user_id, JSON.stringify(sessionData)]
            );
            
            res.cookie('sessionId', sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'lax'
            });
            
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Session creation error:', error);
            res.redirect('/login?error=session_failed');
        }
    }
);

router.post('/login', async (req, res) => {
    return res.status(501).json({
        success: false,
        message: 'Direktna prijava nije dostupna. Molimo koristite AAI@EduHr prijavu.',
        redirect: '/api/auth/login/aaieduhr'
    });
});

router.get('/status', async (req, res) => {
    try {
        const sessionId = req.cookies.sessionId;
        
        if (!sessionId) {
            return res.json({ 
                success: true, 
                authenticated: false,
                isAuthenticated: false,
                user: null
            });
        }
        
        const [sessions] = await db.raw(
            'SELECT session_id, user_id, session_data, last_activity, expires_at FROM sessions WHERE session_id = ? AND expires_at > NOW()',
            [sessionId]
        );
        
        if (sessions.length === 0) {
            res.clearCookie('sessionId');
            return res.json({ 
                success: true, 
                authenticated: false,
                isAuthenticated: false,
                user: null
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
        
        res.json({ 
            success: true, 
            authenticated: true,
            isAuthenticated: true,
            user: userData
        });
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Greška pri provjeri sesije',
            error: error.message 
        });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const sessionId = req.cookies.sessionId;
        
        if (sessionId) {
            await db.raw('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
        }
        
        res.clearCookie('sessionId');
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Greška pri odjavi',
            error: error.message 
        });
    }
});

module.exports = router;