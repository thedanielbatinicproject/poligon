import pool from '../db';
import { SessionData } from 'express-session';

// Get all active session IDs for a user
export async function getActiveSessionIdsForUser(userId: number) {
  const [rows] = await pool.query(
    'SELECT session_id FROM sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY last_activity DESC',
    [userId]
  );
  return (rows as any[]).map(row => row.session_id);
}

// Get session by session_id (returns full session object)
export async function getSessionById(session_id: string): Promise<SessionData | null> {
  const [rows] = await pool.query('SELECT * FROM sessions WHERE session_id = ?', [session_id]);
  if ((rows as any[]).length === 0) return null;
  const row = (rows as any)[0];
  // Parse session_data JSON and merge with explicit columns
  const session: SessionData = {
    ...JSON.parse(row.session_data),
    user_id: row.user_id,
    last_route: row.last_route,
    last_document_id: row.last_document_id,
    editor_cursor_position: row.editor_cursor_position,
    editor_scroll_line: row.editor_scroll_line,
    scroll_position: row.scroll_position,
    sidebar_state: row.sidebar_state,
    theme: row.theme,
    user_agent: row.user_agent,
    ip_address: row.ip_address,
    created_at: row.created_at,
    last_activity: row.last_activity,
    expires_at: row.expires_at,
  };
  return session;
}

// Insert or update session (full schema)
export async function upsertSession(session_id: string, sessionData: SessionData) {
  const user_id = sessionData.user_id || null;
  const session_data = JSON.stringify(sessionData);
  const last_route = sessionData.last_route || null;
  const last_document_id = sessionData.last_document_id || null;
  const editor_cursor_position = sessionData.editor_cursor_position || 0;
  const editor_scroll_line = sessionData.editor_scroll_line || 0;
  const scroll_position = sessionData.scroll_position || 0;
  const sidebar_state = sessionData.sidebar_state || 'open';
  const theme = sessionData.theme || 'light';
  const user_agent = sessionData.user_agent || null;
  const ip_address = sessionData.ip_address || null;
  const created_at = sessionData.created_at ? new Date(sessionData.created_at) : new Date();
  const last_activity = new Date();
  const expires_at = sessionData.expires_at ? new Date(sessionData.expires_at) : (sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires) : null);
  await pool.query(
    `INSERT INTO sessions (
      session_id, user_id, session_data, last_route, last_document_id,
      editor_cursor_position, editor_scroll_line, scroll_position,
      sidebar_state, theme, user_agent, ip_address, created_at, last_activity, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      session_data = VALUES(session_data),
      last_route = VALUES(last_route),
      last_document_id = VALUES(last_document_id),
      editor_cursor_position = VALUES(editor_cursor_position),
      editor_scroll_line = VALUES(editor_scroll_line),
      scroll_position = VALUES(scroll_position),
      sidebar_state = VALUES(sidebar_state),
      theme = VALUES(theme),
      user_agent = VALUES(user_agent),
      ip_address = VALUES(ip_address),
      last_activity = VALUES(last_activity),
      expires_at = VALUES(expires_at)
    `,
    [
      session_id, user_id, session_data, last_route, last_document_id,
      editor_cursor_position, editor_scroll_line, scroll_position,
      sidebar_state, theme, user_agent, ip_address, created_at, last_activity, expires_at
    ]
  );
}

// Delete session by session_id
export async function deleteSessionById(session_id: string) {
  await pool.query('DELETE FROM sessions WHERE session_id = ?', [session_id]);
}

// Touch session (update last_activity and expires_at)
export async function touchSessionById(session_id: string, sessionData: SessionData) {
  const last_activity = new Date();
  const expires_at = sessionData.expires_at ? new Date(sessionData.expires_at) : (sessionData.cookie && sessionData.cookie.expires ? new Date(sessionData.cookie.expires) : null);
  await pool.query(
    'UPDATE sessions SET last_activity = ?, expires_at = ? WHERE session_id = ?',
    [last_activity, expires_at, session_id]
  );
}
