import pool from '../db';

export async function getActiveSessionIdsForUser(userId: number) {
  const [rows] = await pool.query(
    'SELECT session_id FROM sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY last_activity DESC',
    [userId]
  );
  return (rows as any[]).map(row => row.session_id);
}

//TODO Dodaj još funkcija po potrebi (getLastSessionIdForUser, createSession, updateSessionActivity, deleteSession, ...)