import pool from '../db';
import { User } from '../types/user';

export async function getUserById(userId: number): Promise<User | null> {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE user_id = ?',
    [userId]
  );
  return (rows as any[])[0] || null;
}

export async function getUserByPrincipalName(principalName: string): Promise<User | null> {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE principal_name = ?',
    [principalName]
  );
  return (rows as any[])[0] || null;
}

export async function createUser(user: Partial<User> & { principal_name: string, affiliation?: string, display_name?: string }): Promise<User | null> {
  const [result] = await pool.query(
    `INSERT INTO users (principal_name, first_name, last_name, email, role, preferred_language, affiliation, display_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.principal_name,
      user.first_name || '',
      user.last_name || '',
      user.email || '',
      user.role || 'student',
      user.preferred_language || 'hr',
      user.affiliation || null,
      user.display_name || null
    ]
  );
  const insertId = (result as any).insertId;
  return getUserById(insertId);
}

export async function editUser(userId: number, updates: Partial<User>): Promise<User | null> {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  if (!fields) return getUserById(userId);
  await pool.query(
    `UPDATE users SET ${fields} WHERE user_id = ?`,
    [...values, userId]
  );
  return getUserById(userId);
}

// --- Session attribute updaters with validation ---

function isSidebarState(val: any): val is 'open' | 'closed' {
  return val === 'open' || val === 'closed';
}
function isTheme(val: any): val is 'light' | 'dark' | 'auto' {
  return val === 'light' || val === 'dark' || val === 'auto';
}

export async function updateSidebarState(userId: number, sidebar_state: any) {
  if (!isSidebarState(sidebar_state)) throw new Error('Invalid sidebar_state');
  await pool.query('UPDATE sessions SET sidebar_state = ? WHERE user_id = ?', [sidebar_state, userId]);
}

export async function updateTheme(userId: number, theme: any) {
  if (!isTheme(theme)) throw new Error('Invalid theme');
  await pool.query('UPDATE sessions SET theme = ? WHERE user_id = ?', [theme, userId]);
}

export async function updateLastRoute(userId: number, last_route: any) {
  if (typeof last_route !== 'string' || last_route.length > 255) throw new Error('Invalid last_route');
  await pool.query('UPDATE sessions SET last_route = ? WHERE user_id = ?', [last_route, userId]);
}

export async function updateLastDocumentId(userId: number, last_document_id: any) {
  if (typeof last_document_id !== 'number' || !Number.isInteger(last_document_id)) throw new Error('Invalid last_document_id');
  await pool.query('UPDATE sessions SET last_document_id = ? WHERE user_id = ?', [last_document_id, userId]);
}

export async function updateEditorCursorPosition(userId: number, editor_cursor_position: any) {
  if (typeof editor_cursor_position !== 'number' || !Number.isInteger(editor_cursor_position)) throw new Error('Invalid editor_cursor_position');
  await pool.query('UPDATE sessions SET editor_cursor_position = ? WHERE user_id = ?', [editor_cursor_position, userId]);
}

export async function updateEditorScrollLine(userId: number, editor_scroll_line: any) {
  if (typeof editor_scroll_line !== 'number' || !Number.isInteger(editor_scroll_line)) throw new Error('Invalid editor_scroll_line');
  await pool.query('UPDATE sessions SET editor_scroll_line = ? WHERE user_id = ?', [editor_scroll_line, userId]);
}

export async function updateScrollPosition(userId: number, scroll_position: any) {
  if (typeof scroll_position !== 'number' || !Number.isInteger(scroll_position)) throw new Error('Invalid scroll_position');
  await pool.query('UPDATE sessions SET scroll_position = ? WHERE user_id = ?', [scroll_position, userId]);
}