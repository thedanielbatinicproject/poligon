import { Router, Request, Response } from 'express';
import { checkLogin, checkAdmin, checkMentor } from '../middleware/auth.middleware';
import { getUserById, createUser, editUser, getAllNonAdminUsers, 
        getAllUsersReduced, createLocalUser, generateMemorablePassword, 
        getUserByEmail, changeLocalUserPassword, getLocalUserByEmail, getRoleById,
        getAllUsers, getUserSessions, deleteAllUserSessions, bulkUpdateUserRoles } from '../services/user.service';
import {sendPasswordEmail} from '../services/mail.service';
import bcrypt from 'bcrypt';
import { get } from 'http';
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

// PUT /api/users/bulk-role - Bulk update roles for multiple users (admin-only)
// MUST come BEFORE /:user_id route to avoid route parameter collision
usersRouter.put('/bulk-role', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { user_ids, new_role } = req.body;
    
    console.log('[BULK-ROLE] Received request:', { user_ids, new_role, body: req.body });
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids must be a non-empty array' });
    }
    
    if (!new_role || typeof new_role !== 'string') {
      return res.status(400).json({ error: 'new_role must be a valid string' });
    }

    const updatedCount = await bulkUpdateUserRoles(user_ids, new_role);
    console.log('[BULK-ROLE] Successfully updated', updatedCount, 'users');
    res.json({ success: true, users_updated: updatedCount });
  } catch (err: any) {
    console.error('[BULK-ROLE] Error:', err);
    res.status(500).json({ error: 'Failed to update user roles!', details: err.message || String(err) });
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

// GET /api/users/check/:user_id Dohvati podatke za jednog korisnika (samo admin, mentor ili sam korisnik)
usersRouter.get('/check/:user_id', checkLogin, async (req: Request, res: Response) => {
  const userId = Number(req.params.user_id);
  const sessionUserId = req.session.user_id;
  if (sessionUserId === undefined) {
    return res.status(401).json({ error: 'User not authenticated!' });
  }
  const sessionRole = await getRoleById(sessionUserId);
  if (sessionRole !== 'admin' && sessionRole !== 'mentor' && sessionUserId !== userId) {
    return res.status(403).json({ error: 'Not authorized to view this user!!!' });
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

// GET /api/users/reduced - Get reduced user list for messaging, accessible to all logged-in users
usersRouter.get('/reduced', checkLogin, async (req: Request, res: Response) => {
  try {
    // Allow admins and mentors to see admin users as well (so they can be selected/seen)
    const sessionRole = req.session?.role;
    const includeAdmins = sessionRole === 'admin' || sessionRole === 'mentor';
    const users = await getAllUsersReduced(includeAdmins);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users for messaging!', details: err });
  }
});

// POST /api/users/register-local - registration for local users
usersRouter.post('/register-local', async (req, res) => {
  try {
    const { first_name, last_name, email } = req.body;
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Missing required fields: first_name, last_name, email' });
    }

    // postoji li korisnik u users tablici?
    const existing = await getUserByEmail(email);

    // Ako korisnik već postoji u users
    if (existing) {
      // provjeri ima li već local_users zapis
      const existingLocal = await getLocalUserByEmail(email);
      if (existingLocal) {
        // local account već postoji, signaliziraj 409 (ili custom poruku)
        return res.status(409).json({ error: 'Local user with this email already exists!' });
      }

      // nema local_users zapisa -> napravimo local_user za postojećeg korisnika
      const password = generateMemorablePassword(6);
      const passwordHash = await bcrypt.hash(password, 10);

      const created = await createLocalUser({
        user_id: existing.user_id,
        email,
        password_hash: passwordHash
      });

      if (!created) {
        // moguće DB ograničenje; vrati grešku
        return res.status(500).json({ error: 'Failed to create user in local_users table.' });
      }

      // pošalji email s lozinkom
      await sendPasswordEmail(email, password);

      return res.status(201).json({ success: true, user_id: existing.user_id });
    }

    // ako ne postoji user u users - postojeća logika: kreiraj novog usera pa local_user
    const password = generateMemorablePassword(6);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
      principal_name: email, // ili neke prazne vrijednosti; prilagodi ako treba
      first_name,
      last_name,
      email,
      preferred_language: 'hr'
    });

    if (!user) {
      // createUser vraća null kad email već postoji (za svaki slučaj)
      return res.status(409).json({ error: 'User with this email already exists!' });
    }

    const localUser = await createLocalUser({
      user_id: user.user_id,
      email,
      password_hash: passwordHash
    });

    if (!localUser) {
      return res.status(500).json({ error: 'Failed to create user in local_users table.' });
    }

    await sendPasswordEmail(email, password);
    res.status(201).json({ success: true, user_id: user.user_id });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err });
  }
});

// POST /api/users/local-change-password - Change password for local users
usersRouter.post('/local-change-password', checkLogin, async (req, res) => {
  try {
    // Coerce and validate inputs to avoid type-mismatch authorization errors
    const rawUserId = req.body?.user_id;
    const new_password = req.body?.new_password;
    const sessionUserId = Number(req.session.user_id);
    const sessionRole = req.session.role;

    if (!rawUserId || !new_password) {
      return res.status(400).json({ error: 'Missing required fields: user_id, new_password' });
    }

    const user_id = Number(rawUserId);
    if (!Number.isInteger(user_id) || user_id <= 0) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    // Only admin can change anyone's password, others can only change their own
    if (sessionRole !== 'admin' && sessionUserId !== user_id) {
      return res.status(403).json({ error: `Not authorized to change this user's password! Tried to change user_id=${user_id}` });
    }

    // Hash the new password and update local_users
    const passwordHash = await bcrypt.hash(new_password, 10);
    const result = await changeLocalUserPassword(user_id, passwordHash);

    if (result) {
      return res.json({ success: true });
    } else {
      // If update affected 0 rows, return 404 with clear message
      return res.status(404).json({ error: 'Local user not found or password not changed for provided user_id' });
    }
  } catch (err) {
    // log server-side error for debugging
    console.error('Error in /api/users/local-change-password:', err);
    res.status(500).json({ error: 'Password change failed!', details: String(err) });
  }
});

// GET /api/users - Get ALL users including admins (admin-only)
usersRouter.get('/', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all users from database!', details: err });
  }
});

// GET /api/users/sessions/:user_id - Get all active sessions for a specific user (admin-only)
usersRouter.get('/sessions/:user_id', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.user_id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }
    const sessions = await getUserSessions(userId);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user sessions!', details: err });
  }
});

// DELETE /api/users/sessions/:user_id - Delete all sessions for a user (force logout, admin-only)
usersRouter.delete('/sessions/:user_id', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.user_id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }
    const deletedCount = await deleteAllUserSessions(userId);
    res.json({ success: true, sessions_deleted: deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user sessions!', details: err });
  }
});

export default usersRouter;