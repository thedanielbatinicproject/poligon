import { Request, Response, NextFunction } from 'express';

// Provjera je li korisnik prijavljen
export function checkLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Resource you tried to access is restricted to authenticated users!' });
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
