// Get session by session_id
export async function getSessionById(session_id: string) {
  const [rows] = await pool.query('SELECT * FROM sessions WHERE session_id = ?', [session_id]);
  if ((rows as any[]).length === 0) return null;
  const row = (rows as any)[0];
  return JSON.parse(row.session_data);
}

// Insert or update session
export async function upsertSession(session_id: string, sessionData: any) {
  const user_id = sessionData.user_id || null;
  const session_data = JSON.stringify(sessionData);
  const ip_address = sessionData.ip_address || null;
  const user_agent = sessionData.user_agent || null;
  const last_activity = new Date();
  const expires_at = sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires) : null;
  await pool.query(
    `INSERT INTO sessions (session_id, user_id, session_data, ip_address, user_agent, last_activity, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       session_data = VALUES(session_data),
       ip_address = VALUES(ip_address),
       user_agent = VALUES(user_agent),
       last_activity = VALUES(last_activity),
       expires_at = VALUES(expires_at)`,
    [session_id, user_id, session_data, ip_address, user_agent, last_activity, expires_at]
  );
}

// Delete session by session_id
export async function deleteSessionById(session_id: string) {
  await pool.query('DELETE FROM sessions WHERE session_id = ?', [session_id]);
}

// Touch session (update last_activity and expires_at)
export async function touchSessionById(session_id: string, sessionData: any) {
  const last_activity = new Date();
  const expires_at = sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires) : null;
  await pool.query(
    'UPDATE sessions SET last_activity = ?, expires_at = ? WHERE session_id = ?',
    [last_activity, expires_at, session_id]
  );
}
import pool from '../db';

export async function getActiveSessionIdsForUser(userId: number) {
  const [rows] = await pool.query(
    'SELECT session_id FROM sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY last_activity DESC',
    [userId]
  );
  return (rows as any[]).map(row => row.session_id);
}

//TODO Dodaj još funkcija po potrebi (getLastSessionIdForUser, createSession, updateSessionActivity, deleteSession, ...)