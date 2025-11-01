import { Request, Response, NextFunction } from 'express';
import { getRoleById } from '../services/user.service';

// Provjera je li korisnik prijavljen
export function checkLogin(req: Request, res: Response, next: NextFunction) {
  // Support both session shapes: older code stored top-level user_id, newer code may store a user object.
  const sessionUser = (req.session as any).user || null
  const sessionUserId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null
  if (!req.session || !sessionUserId) {
    return res.status(401).json({ error: 'Resource you tried to access is restricted to users that are logged in!' });
  }
  // If role is missing on an existing session (older sessions), try to load it from DB
  if (!(req.session as any).role && sessionUserId) {
    // non-blocking: attempt to set role synchronously with await-like behavior
    // since middleware can't be async here, we'll fetch role and then call next when ready
    (async () => {
      try {
        const role = await getRoleById(Number(sessionUserId));
        if (role) {
          (req.session as any).role = role;
        }
      } catch (e) {
        console.error('Failed to hydrate session.role for user', sessionUserId, e);
      }
      next();
    })();
    return;
  }
  next();
}

// Provjera je li korisnik admin
export function checkAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Resource you tried to access is restricted to admins!' });
  }
  next();
}

// Provjera je li korisnik mentor
export function checkMentor(req: Request, res: Response, next: NextFunction) {
  if (!req.session || req.session.role !== 'mentor') {
    return res.status(403).json({ error: 'Resource you tried to access is restricted to mentors!' });
  }
  next();
}

// Provjera je li korisnik student
export function checkStudent(req: Request, res: Response, next: NextFunction) {
  if (!req.session || req.session.role !== 'student') {
    return res.status(403).json({ error: 'Resource you tried to access is restricted to students!' });
  }
  next();
}
