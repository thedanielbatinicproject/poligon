const express = require('express');
const router = express.Router();
const passport = require('passport');
const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const db = require('../db/index');
const { XMLParser } = require('fast-xml-parser');

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Check if we should skip SAML validation (for development with simulator)
const skipSamlValidation = process.env.DEV_MODE_SKIP_SAML_VALIDATION === 'true';

// Dummy certificate for dev mode (not used for validation)
const DUMMY_CERT = 'MIIDXTCCAkWgAwIBAgIJALmVVuDWu4NYMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwHhcNMTYxMjI4MTkzNzQ1WhcNMjYxMjI2MTkzNzQ1WjBFMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzUCFozgNb1h1M0jzNRSCjhOBnR+uVbVpaWfXYIR+AhWDdEe5ryY+CgavOg8bfLybyzFdehlYdDRgkedEB/GjG8aJw06l0qF4jDOAw0kEygWCu2mcH7XOxRt+YAH3TVHa/Hu1W3WjzkobqqqLQ8gkKWWM27fOgAZ6GieaJBN6VBSMMcPey3HWLBmc+TYJmv1dbaO2jHhKh8pfKw0W12VM8P1PIO8gv4Phu/uuJYieBWKixBEyy0lHjyixYFCR12xdh4CA47q958ZRGnnDUGFVE1QhgRacJCOZ9bd5t9mr8KLaVBYTCJo5ERE8jymab5dPqe5qKfJsCZiqWglbjUo9twIDAQABo1AwTjAdBgNVHQ4EFgQUxpuwcs/CYQOyui+r1G+3KxBNhxkwHwYDVR0jBBgwFoAUxpuwcs/CYQOyui+r1G+3KxBNhxkwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAAiWUKs/2x/viNCKi3Y6blEuCtAGhzOOZ9EjrvJ8+COH3Rag3tVBWrcBZ3/uhhPq5gy9lqw4OkvEws99/5jFsX1FJ6MKBgqfuy7yh5s1YfM0ANHYczMmYpZeAcQf2CGAaVfwTTfSlzNLsF2lW/ly7yapFzlYSJLGoVE+OHEu8g09zSvjRM2dhNLiCcKJi3sJc1iztz1uIm0BaNJAr5Z3VpLScVo8VkgO/pLL2jrKJRZ1m5BkVYdgLs8SLJr3GPDWJLMVyxf8SBCbJWf1M+5SXkz0BtFPd+VxLdVV7Z6JmZhfLMJDI4CfPE7I5T+N7vGx1O4rZkm1b0+XLFXMxDnHFKw==';

// In dev mode - skip SAML validation
passport.use(new SamlStrategy({
    entryPoint: process.env.AAIEDUHR_SAML_ENTRY_POINT || 'https://login.aaiedu.hr/simplesaml/saml2/idp/SSOService.php',
    issuer: process.env.AAIEDUHR_SAML_ISSUER || 'https://yourapp.com',
    callbackUrl: process.env.AAIEDUHR_SAML_CALLBACK_URL || 'http://localhost:3000/api/auth/callback/aaieduhr',
    // Use dummy cert in dev mode (won't be validated anyway), real cert in production
    idpCert: skipSamlValidation ? DUMMY_CERT : process.env.AAIEDUHR_SAML_CERT,
    identifierFormat: null,
    signatureAlgorithm: 'sha256',
    // Disable ALL signature validation in dev mode with simulator
    wantAssertionsSigned: skipSamlValidation ? false : true,
    wantAuthnResponseSigned: skipSamlValidation ? false : true,
    validateInResponseTo: skipSamlValidation ? 'never' : 'ifPresent',
    disableRequestedAuthnContext: skipSamlValidation
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

// Expose whether dev-mode SAML validation skip is enabled (frontend uses this to show admin checkbox)
router.get('/config', (req, res) => {
    res.json({ devModeSkipSamlValidation: skipSamlValidation });
});

// Initiate SAML login. Accept an optional ?as_admin=1 query param which will be
// forwarded to the IdP as RelayState so the flag returns on the POST callback.
router.get('/login/aaieduhr', async (req, res, next) => {
    const asAdmin = req.query.as_admin === '1' || req.query.as_admin === 'true';
    const opts = { failureRedirect: '/login', failureFlash: true };
    if (asAdmin) {
        // Create a short-lived DB token to carry the admin intent. We'll set RelayState
        // to this token so the callback can securely fetch the intent from DB.
        const crypto = require('crypto');
        const token = 'pl_' + crypto.randomBytes(12).toString('hex');
        try {
            // Insert into pending_logins table. TTL 5 minutes.
            await db.raw(
                `INSERT INTO pending_logins (token, as_admin, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
                [token, 1]
            );
            opts.additionalParams = { RelayState: token };
        } catch (e) {
            // If DB insert fails, fall back to RelayState=as_admin=1 (less secure)
            opts.additionalParams = { RelayState: `as_admin=1` };
        }
    }
    passport.authenticate('saml', opts)(req, res, next);
});
// Development helper: strip any XML <Signature> elements from SAMLResponse to fully disable signature validation
function stripSamlSignatureMiddleware(req, res, next) {
    if (!skipSamlValidation) return next();

    try {
        const encoded = req.body && (req.body.SAMLResponse || req.body.SAMLresponse);
        if (!encoded) return next();

        const decoded = Buffer.from(encoded, 'base64').toString('utf8');


        // Remove any Signature blocks entirely (handles <Signature> and namespaced variants like <ds:Signature>)
        const cleaned = decoded.replace(/<(?:\w+:)?Signature[\s\S]*?<\/(?:\w+:)?Signature>/gi, '');


        const reencoded = Buffer.from(cleaned, 'utf8').toString('base64');

    // Overwrite both possible casing variants
    if (req.body.SAMLResponse) req.body.SAMLResponse = reencoded;
    if (req.body.SAMLresponse) req.body.SAMLresponse = reencoded;
    } catch (err) {
        console.error('[AUTH] Error stripping SAML signature in dev middleware:', err);
        // continue anyway
    }

    next();
}

router.post('/callback/aaieduhr',
    stripSamlSignatureMiddleware,
    async (req, res, next) => {
        // In dev mode we skip node-saml signature validation and instead parse the
        // cleaned SAMLResponse ourselves. This keeps a single env switch to enable
        // development flow without changing production behaviour.
        if (skipSamlValidation) {
            try {
                const encoded = req.body && (req.body.SAMLResponse || req.body.SAMLresponse);
                if (!encoded) {
                    console.error('[AUTH] DEV MODE: no SAMLResponse found in request');
                    return res.redirect('/login?auth_error=no_saml');
                }
                const decoded = Buffer.from(encoded, 'base64').toString('utf8');

                // Parse XML using fast-xml-parser to handle namespaces and nested nodes
                const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
                let parsed;
                try {
                    parsed = parser.parse(decoded);
                } catch (e) {
                    console.error('[AUTH] DEV MODE: failed parsing SAMLResponse XML:', e);
                    return res.redirect('/login?auth_error=invalid_saml');
                }


                // Extract attributes from parsed object. SAML responses vary in namespace
                const attrs = {};
                const resp = parsed['samlp:Response'] || parsed.Response || parsed;
                const assertion = (resp && (resp['saml:Assertion'] || resp.Assertion)) || resp;
                const attributeStatement = assertion && (assertion['saml:AttributeStatement'] || assertion.AttributeStatement);

                const ensureArray = v => Array.isArray(v) ? v : (v ? [v] : []);
                const attributeNodes = attributeStatement && (attributeStatement['saml:Attribute'] || attributeStatement.Attribute) || [];
                for (const attrNode of ensureArray(attributeNodes)) {
                    const name = attrNode['@_Name'] || attrNode.Name || attrNode['Name'] || '';
                    if (!name) continue;
                    const rawValues = attrNode['saml:AttributeValue'] || attrNode.AttributeValue || attrNode['AttributeValue'];
                    const values = [];
                    for (const v of ensureArray(rawValues)) {
                        if (v && typeof v === 'object') {
                            // fast-xml-parser may return text under '#text' or as value
                            if ('#text' in v) values.push(String(v['#text']).trim());
                            else if ('@_Value' in v) values.push(String(v['@_Value']).trim());
                        } else if (typeof v === 'string') {
                            values.push(v.trim());
                        }
                    }
                    attrs[name] = values.length > 1 ? values : (values[0] || '');
                }

                // Fallback: NameID in Subject
                const subject = assertion && (assertion['saml:Subject'] || assertion.Subject);
                const nameIdNode = subject && (subject['saml:NameID'] || subject.NameID);
                if (nameIdNode && !attrs.nameID) {
                    if (typeof nameIdNode === 'string') attrs.nameID = nameIdNode;
                    else if (nameIdNode && typeof nameIdNode === 'object') attrs.nameID = nameIdNode['#text'] || '';
                }

                // Map extracted attributes to the profile shape expected by the
                // strategy verify callback used elsewhere in this file.
                const profile = {};
                profile.email = attrs.mail || attrs.email || attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || attrs.nameID || '';
                profile.givenName = attrs.givenName || attrs.givenname || attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || '';
                profile.sn = attrs.sn || attrs.surname || attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || '';
                profile.cn = attrs.cn || '';
                profile.eduPersonAffiliation = attrs.eduPersonAffiliation || attrs['urn:oid:1.3.6.1.4.1.5923.1.1.1.1'] || attrs['eduPersonAffiliation'] || '';
                profile.nameID = attrs.nameID || profile.email;

                // Normalize affiliation into array/string similar to node-saml behaviour
                if (typeof profile.eduPersonAffiliation === 'string' && profile.eduPersonAffiliation.indexOf(';') !== -1) {
                    profile.eduPersonAffiliation = profile.eduPersonAffiliation.split(';').map(s => s.trim()).filter(Boolean);
                }
                // Reuse the same user lookup / creation logic that the strategy uses
                const email = profile.email;
                if (!email) {
                    console.error('[AUTH] DEV MODE: parsed SAMLResponse but no email found');
                    return res.redirect('/login?auth_error=no_email');
                }

                let firstName = profile.givenName || 'Nepoznato';
                let lastName = profile.sn || 'Ime';
                const affiliation = profile.eduPersonAffiliation || '';
                // Derive an affiliation-based role (kept for reference), but
                // NEW USERS default to 'student' unless they clicked the dev admin flag.
                let affiliationRole = 'student';
                if (Array.isArray(affiliation)) {
                    if (affiliation.includes('faculty') || affiliation.includes('staff')) affiliationRole = 'mentor';
                    else if (affiliation.includes('student')) affiliationRole = 'student';
                } else if (typeof affiliation === 'string') {
                    if (affiliation.includes('faculty') || affiliation.includes('staff')) affiliationRole = 'mentor';
                    else if (affiliation.includes('student')) affiliationRole = 'student';
                }

                const [existingUsers] = await db.raw(
                    'SELECT user_id, first_name, last_name, email, role, preferred_language FROM users WHERE email = ?',
                    [email]
                );

                let user;
                let role = 'student';
                // Consume RelayState token which should be a pending_logins.token OR
                // a legacy 'as_admin=1' string. Prefer DB-backed token when present.
                const relayStateRaw = (req.body && (req.body.RelayState || req.body.relayState || req.body.Relaystate)) || '';
                let pendingRecord = null;
                try {
                    // If relayState looks like our token (starts with pl_), try DB
                    if (relayStateRaw && relayStateRaw.startsWith('pl_')) {
                        const [rows] = await db.raw('SELECT id, token, as_admin FROM pending_logins WHERE token = ? AND expires_at > NOW()', [relayStateRaw]);
                        if (Array.isArray(rows) && rows.length > 0) {
                            pendingRecord = rows[0];
                            // consume it (delete) immediately to avoid replay
                            await db.raw('DELETE FROM pending_logins WHERE id = ?', [pendingRecord.id]);
                        }
                    }
                } catch (e) {
                    // ignore DB lookup errors; fall back to plain relayState parsing
                }

                if (pendingRecord && pendingRecord.as_admin === 1) {
                    role = 'admin';
                } else {
                    try {
                        const params = new URLSearchParams(relayStateRaw.replace(/^\?/, ''));
                        if (params.get('as_admin') === '1' || params.get('as_admin') === 'true') {
                            role = 'admin';
                        }
                    } catch (e) {
                        // ignore parse errors; relayState may be arbitrary string
                    }
                }
                // Decide role and persist appropriately
                if (existingUsers.length === 0) {
                    // New user: assign 'admin' only if dev admin was requested; otherwise default to 'student'
                    const newRole = (role === 'admin') ? 'admin' : 'student';

                    const [result] = await db.raw(
                        `INSERT INTO users (first_name, last_name, email, role, preferred_language, created_at, updated_at) 
                         VALUES (?, ?, ?, ?, 'hr', NOW(), NOW())`,
                        [firstName, lastName, email, newRole]
                    );

                    user = {
                        user_id: result.insertId,
                        first_name: firstName,
                        last_name: lastName,
                        email: email,
                        role: newRole,
                        preferred_language: 'hr'
                    };
                } else {
                    user = existingUsers[0];
                    // If the dev admin flag is present, ensure the user is admin
                    const asAdminRequested = (role === 'admin');
                    if (asAdminRequested) {
                        if (user.role !== 'admin') {
                            try {
                                await db.raw('UPDATE users SET role = ?, updated_at = NOW() WHERE user_id = ?', ['admin', user.user_id]);
                                user.role = 'admin';
                            } catch (e) {
                                if (AUTH_DEBUG) console.error('[AUTH] Failed to update existing user role to admin (DEV):', e && e.message);
                            }
                        }
                    } else {
                        // No admin requested. If the existing user was admin, downgrade to student per requirement.
                        if (user.role === 'admin') {
                            try {
                                await db.raw('UPDATE users SET role = ?, updated_at = NOW() WHERE user_id = ?', ['student', user.user_id]);
                                user.role = 'student';
                            } catch (e) {
                                if (AUTH_DEBUG) console.error('[AUTH] Failed to downgrade existing admin to student (DEV):', e && e.message);
                            }
                        }
                        // Otherwise leave existing non-admin roles unchanged
                    }
                }

                // Attach user and proceed to session creation (dev path)
                try {
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

                    // No dev cookie to clear (we use DB-backed pending_logins now)

                    return res.redirect('/');
                } catch (error) {
                    console.error('Session creation error (DEV):', error);
                    return res.redirect('/login?error=session_failed');
                }
            } catch (err) {
                console.error('[AUTH] DEV MODE: error parsing SAMLResponse:', err);
                return res.redirect('/login?auth_error=invalid_saml');
            }
        }

        // Production behaviour: let passport/node-saml handle validation.
        // We provide an async callback so we can await DB operations. The returned
        // promise is not used by passport, so we handle errors with try/catch
        // and then invoke the middleware immediately with (req, res, next).
        passport.authenticate('saml', async (err, user, info) => {
            if (err) {
                console.error('[AUTH] SAML authentication error:', err.message || err);
                console.error('[AUTH] Full error:', err);
                // Redirect to login with an error code so frontend can show a notification
                return res.redirect('/login?auth_error=invalid_signature');
            }

            if (!user) {
                console.error('[AUTH] No user returned from SAML');
                return res.redirect('/login?auth_error=no_user');
            }

            try {
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

                return res.redirect('/');
            } catch (error) {
                console.error('Session creation error:', error);
                return res.redirect('/login?error=session_failed');
            }
        })(req, res, next);
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