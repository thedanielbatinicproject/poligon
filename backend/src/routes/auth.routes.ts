import { Router, Request, Response } from 'express';
import { getUserById, getUserByPrincipalName, createUser, getUserByEmail, editUser } from '../services/user.service';
import { getActiveSessionIdsForUser, getLocalUserByEmail } from '../services/session.service';
import passport from 'passport';
import { SessionData } from 'express-session';
import bcrypt from 'bcrypt';
import { OID } from '../config/oid';

const authRouter = Router();

// GET /auth/login/aaieduhr - Initiate SAML login
authRouter.get('/login/aaieduhr', (req: Request, res: Response) => {
  passport.authenticate('saml', { failureRedirect: '/', failureFlash: true })(req, res);
});

// POST /auth/callback/aaieduhr - SAML callback endpoint
// This route: checks the user, creates them if needed, fills the session with data, and returns a JSON response - restful architecture
authRouter.post('/callback/aaieduhr',
  passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }),
  async (req: Request, res: Response) => {
    try {
      const profile = req.user as any;
      const principalName = profile[OID.eduPersonPrincipalName];
      const email = profile[OID.email];

      // Dynamic role assignment based on eduPersonAffiliation
      let role: 'student' | 'user' | 'mentor' | 'admin' = 'student';
      const affiliation = profile[OID.eduPersonAffiliation];
      if (affiliation) {
        if (typeof affiliation === 'string') {
          if (affiliation.includes('faculty')) role = 'mentor';
          else if (affiliation.includes('staff')) role = 'admin';
          else if (affiliation.includes('student')) role = 'student';
        } else if (Array.isArray(affiliation)) {
          if (affiliation.includes('faculty')) role = 'mentor';
          else if (affiliation.includes('staff')) role = 'admin';
          else if (affiliation.includes('student')) role = 'student';
        }
      }

      // First try to find the user by principal_name
      let user = await getUserByPrincipalName(principalName);

      if (!user) {
        // If not found by principal_name, try by email
        const userByEmail = await getUserByEmail(email);
        if (userByEmail) {
          // If a user with this email exists, update their data
          await editUser(userByEmail.user_id, {
            first_name: profile[OID.givenName],
            last_name: profile[OID.sn],
            role,
            preferred_language: 'hr', // or from profile if exists
          });
          // Retrieve the user again with updated data
          user = await getUserById(userByEmail.user_id);
        } else {
          // If not found, create a new user
          user = await createUser({
            principal_name: principalName,
            email,
            first_name: profile[OID.givenName],
            last_name: profile[OID.sn],
            role,
            preferred_language: 'hr', // or from profile if exists
            // Other fields from the database if you have them
          });
        }
      }

      if (!user) throw new Error('User creation failed');

      const sessionData: SessionData = {
        user_id: user.user_id,
        email: user.email,
        givenName: user.first_name,
        sn: user.last_name,
        displayName: user.first_name + ' ' + user.last_name,
        eduPersonPrincipalName: principalName,
        eduPersonAffiliation: affiliation,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        last_route: '/dashboard',
        theme: 'light',
        sidebar_state: 'open',
        cookie: req.session.cookie
      };
      Object.assign(req.session, sessionData);
      req.session.save(() => res.status(200).json({ success: true }));
    } catch (err) {
      console.error('SAML callback error:', err);
      res.status(401).json({ error: 'auth_failed' });
    }
  }
);

// POST /auth/login-local - Local user login
authRouter.post('/login-local', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials - user not found by that email!' });
    }

    // Find local user
    const localUser = await getLocalUserByEmail(email);
    if (!localUser) {
      return res.status(401).json({ error: 'Invalid credentials - local user not found by that email!' });
    }

    // Find password
    const match = await bcrypt.compare(password, localUser.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials - password mismatch!' });
    }

    // Set session data like in SAML login
    const sessionData = {
      user_id: user.user_id,
      email: user.email,
      givenName: user.first_name,
      sn: user.last_name,
      displayName: user.first_name + ' ' + user.last_name,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      last_route: '/dashboard',
      theme: 'light',
      sidebar_state: 'open',
      cookie: req.session.cookie
    };
    Object.assign(req.session, sessionData);
    req.session.save(() => res.status(200).json({ success: true }));

  } catch (err) {
    res.status(500).json({ error: 'Login failed!', details: err });
  }
});

// GET /auth/status - Check current session/user
authRouter.get('/status', async (req: Request, res: Response) => {
  // Provjeri je li korisnik prijavljen (npr. postoji user_id u sessionu)
  if (!req.session.user_id) {
    return res.status(401).json({ error: 'User not authenticated!' });
  }

  // Dohvati korisnika iz baze
  const user = await getUserById(req.session.user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found in database! UserID may be ill-defined.' });
  }

  // Dohvati sve aktivne session ID-eve
  const sessionIds = await getActiveSessionIdsForUser(req.session.user_id);

  // Vrati podatke
  res.json({
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    active_sessions: sessionIds
  });
});

// POST /auth/logout - Logout user
authRouter.post('/logout', (req: Request, res: Response, next) => {
  req.logout(function(err) {
    if (err) {
      console.error('Logout error:', err);
      return next(err);
    }
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out' });
    });
  });
});

export default authRouter;