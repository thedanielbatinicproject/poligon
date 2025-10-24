import pool from '../db';

export async function getUserById(userId: number) {
  const [rows] = await pool.query(
    'SELECT user_id, first_name, last_name, email, role, preferred_language FROM users WHERE user_id = ?',
    [userId]
  );
  return (rows as any[])[0] || null;
}

// TODO Dodaj još funkcija po potrebi (getUserByEmail, createUser, updateUser, ...)