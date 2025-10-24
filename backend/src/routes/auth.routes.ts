import { Router, Request, Response } from 'express';
import { getUserById } from '../services/user.service';
import { getActiveSessionIdsForUser } from '../services/session.service';

const authRouter = Router();

// import passport from 'passport';
// import samlStrategy from '../config/saml'; // TODO: implement SAML config

// GET /auth/login/aaieduhr - Initiate SAML login
authRouter.get('/login/aaieduhr', (req: Request, res: Response) => {
  // TODO: Use passport.authenticate('saml', ...) here
  res.status(501).json({ error: 'AAI@EduHr login not implemented yet in backend/routes/auth.routes.ts.' });
});

// POST /auth/callback/aaieduhr - SAML callback endpoint
authRouter.post('/callback/aaieduhr', (req: Request, res: Response) => {
  // TODO: Use passport.authenticate('saml', ...) as callback
  res.status(501).json({ error: 'AAI@EduHr callback not implemented yet in backend/routes/auth.routes.ts.' });
});

// GET /auth/status - Check current session/user
authRouter.get('/status', async (req: Request, res: Response) => {
  // Provjeri je li korisnik prijavljen (npr. postoji user_id u sessionu)
  if (!req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Dohvati korisnika iz baze
  const user = await getUserById(req.session.user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
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
authRouter.post('/logout', (req: Request, res: Response) => {
  // TODO: Destroy session and logout
  res.status(501).json({ error: 'Logout not implemented yet in backend/routes/auth.routes.ts.' });
});

export default authRouter;