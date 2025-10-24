import { Router, Request, Response } from 'express';
import { checkLogin, checkAdmin, checkMentor } from '../middleware/auth.middleware';
import { getUserById, createUser, editUser } from '../services/user.service';
import { getAllNonAdminUsers } from '../services/user.service';

const usersRouter = Router();

// /api/users/all Dohvati sve korisnike (osim admina), dostupno samo adminima i mentorima
usersRouter.get('/all', checkLogin, async (req: Request, res: Response) => {
  const role = req.session.role;
  if (role !== 'admin' && role !== 'mentor') {
    return res.status(403).json({ error: 'Resource (fetch all users) you tried to access is restricted to admins and mentors!' });
  }
  try {
    const users = await getAllNonAdminUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users from database!', details: err });
  }
});

// /api/users Kreiranje korisnika (samo admin)
usersRouter.post('/', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body);
    if (!user) {
      return res.status(409).json({ error: 'User with this email already exists!' });
    }
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user!', details: err });
  }
});

// /api/users/:user_id Uređivanje korisnika (admin može bilo koga, korisnik može sam sebe)
usersRouter.put('/:user_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.user_id);
    const sessionUserId = req.session.user_id;
    const sessionRole = req.session.role;
    if (sessionRole !== 'admin' && sessionUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this user' });
    }
    // Non-admin users cannot edit email or role
    if (sessionRole !== 'admin') {
      if ('email' in req.body || 'role' in req.body) {
        return res.status(403).json({ error: 'Non-admin users cannot edit email or role for themselves!' });
      }
    }
    const updatedUser = await editUser(userId, req.body);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit user', details: err });
  }
});

// /api/users/:user_id Brisanje korisnika (samo admin, admin ne može obrisati druge admine)
usersRouter.delete('/:user_id', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.user_id);
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admin cannot delete another admin!' });
    }
    // Pretpostavljamo da postoji funkcija deleteUser(userId)
    await (global as any).deleteUser?.(userId); // Zamijeni s pravom funkcijom!
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete user with id ${req.params.user_id}`, details: err });
  }
});

// GET /api/users/:user_id Dohvati podatke za jednog korisnika (samo admin, mentor ili sam korisnik)
usersRouter.get('/:user_id', checkLogin, async (req: Request, res: Response) => {
  const userId = Number(req.params.user_id);
  const sessionUserId = req.session.user_id;
  const sessionRole = req.session.role;
  if (sessionRole !== 'admin' && sessionRole !== 'mentor' && sessionUserId !== userId) {
    return res.status(403).json({ error: 'Not authorized to view this user' });
  }
  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: `User with id ${userId} not found!` });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch user with id ${userId}!`, details: err });
  }
});

export default usersRouter;
