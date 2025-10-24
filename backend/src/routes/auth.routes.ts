import { Router, Request, Response } from 'express';
import { getUserById, getUserByPrincipalName, createUser } from '../services/user.service';
import { getActiveSessionIdsForUser } from '../services/session.service';
import passport from 'passport';
import { SessionData } from 'express-session';
import { OID } from '../config/oid';

const authRouter = Router();

// GET /auth/login/aaieduhr - Initiate SAML login
authRouter.get('/login/aaieduhr', (req: Request, res: Response) => {
  passport.authenticate('saml', { failureRedirect: '/', failureFlash: true })(req, res);
});

// POST /auth/callback/aaieduhr - SAML callback endpoint
// Ova ruta: provjerava korisnika, kreira ga ako treba, puni session sa podatcima i vraća JSON odgovor - restful
authRouter.post('/callback/aaieduhr',
  passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }),
  async (req: Request, res: Response) => {
    try {
      const profile = req.user as any;
      const principalName = profile[OID.eduPersonPrincipalName];
      let user = await getUserByPrincipalName(principalName);
      // Dinamičko mapiranje role prema eduPersonAffiliation
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
      if (!user) {
        user = await createUser({
          principal_name: principalName,
          email: profile[OID.email],
          first_name: profile[OID.givenName],
          last_name: profile[OID.sn],
          display_name: profile[OID.displayName],
          affiliation,
          role,
        });
      }
      if (!user) throw new Error('User creation failed');
      const sessionData: SessionData = {
        user_id: user.user_id,
        email: profile[OID.email],
        givenName: profile[OID.givenName],
        sn: profile[OID.sn],
        displayName: profile[OID.displayName],
        eduPersonPrincipalName: principalName,
        eduPersonAffiliation: profile[OID.eduPersonAffiliation],
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