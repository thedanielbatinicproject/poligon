/**
 * Service for managing user data and authentication.
 * Provides functions for user creation, retrieval, update, and validation.
 * All operations are type-safe and support enterprise authentication requirements.
 */
import passport from 'passport';
import pool from '../db';
import { User } from '../types/user';
import passwordGenerator from 'password-generator';

/**
 * Retrieves a user by their user_id from the database.
 * @param userId - The unique identifier of the user.
 * @returns User object or null if not found.
 */
export async function getUserById(userId: number): Promise<User | null> {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE user_id = ?',
    [userId]
  );
  return (rows as any[])[0] || null;
}

/**
 * Retrieves a user by their principal_name (AAI@EduHr or SSO identifier).
 * @param principalName - The principal name of the user.
 * @returns User object or null if not found.
 */
export async function getUserByPrincipalName(principalName: string): Promise<User | null> {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE principal_name = ?',
    [principalName]
  );
  return (rows as any[])[0] || null;
}

/**
 * Creates a new user in the database with provided attributes.
 * First checks if a user with the same email exists; if so, returns null.
 * @param user - Object containing user attributes (principal_name, first_name, last_name, email, role, preferred_language, affiliation, display_name).
 * @returns Newly created User object, or null if email already exists or creation failed.
 */
export async function createUser(user: Partial<User> & { principal_name: string, affiliation?: string, display_name?: string }): Promise<User | null> {
  // Check if user with this email already exists
  if (user.email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [user.email]);
    if ((rows as any[]).length > 0) {
      // User with this email already exists
      return null;
    }
  }
  const [result] = await pool.query(
    `INSERT INTO users (principal_name, first_name, last_name, email, role, preferred_language, affiliation, display_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.principal_name,
      user.first_name || '',
      user.last_name || '',
      user.email || '',
      user.role || 'user',
      user.preferred_language || 'hr',
      user.affiliation || null,
      user.display_name || null
    ]
  );
  const insertId = (result as any).insertId;
  return getUserById(insertId);
}

/**
 * Updates user attributes for a given user_id.
 * @param userId - The unique identifier of the user.
 * @param updates - Object containing attributes to update.
 * @returns Updated User object or null if not found.
 */
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
/**
 * Retrieves all users from the database, excluding those with role 'admin'.
 * @returns Array of User objects (without admins)
 */
export async function getAllNonAdminUsers(): Promise<User[]> {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE role != 'admin'"
  );
  return rows as User[];
}

function isSidebarState(val: any): val is 'open' | 'closed' {
  return val === 'open' || val === 'closed';
}
function isTheme(val: any): val is 'light' | 'dark' | 'auto' {
  return val === 'light' || val === 'dark' || val === 'auto';
}

/**
 * Updates the sidebar_state attribute in the session for a user.
 * @param userId - The unique identifier of the user.
 * @param sidebar_state - 'open' or 'closed'.
 */
export async function updateSidebarState(userId: number, sidebar_state: any) {
  if (!isSidebarState(sidebar_state)) throw new Error('Invalid sidebar_state');
  await pool.query('UPDATE sessions SET sidebar_state = ? WHERE user_id = ?', [sidebar_state, userId]);
}

/**
 * Updates the theme attribute in the session for a user.
 * @param userId - The unique identifier of the user.
 * @param theme - 'light', 'dark', or 'auto'.
 */
export async function updateTheme(userId: number, theme: any) {
  if (!isTheme(theme)) throw new Error('Invalid theme');
  await pool.query('UPDATE sessions SET theme = ? WHERE user_id = ?', [theme, userId]);
}

/**
 * Updates the last_route attribute in the session for a user.
 * @param userId - The unique identifier of the user.
 * @param last_route - The last route visited by the user.
 */
export async function updateLastRoute(userId: number, last_route: any) {
  if (typeof last_route !== 'string' || last_route.length > 255) throw new Error('Invalid last_route');
  await pool.query('UPDATE sessions SET last_route = ? WHERE user_id = ?', [last_route, userId]);
}

/**
 * Updates the last_document_id attribute in the session for a user.
 * @param userId - The unique identifier of the user.
 * @param last_document_id - The last document id accessed by the user.
 */
export async function updateLastDocumentId(userId: number, last_document_id: any) {
  if (typeof last_document_id !== 'number' || !Number.isInteger(last_document_id)) throw new Error('Invalid last_document_id');
  await pool.query('UPDATE sessions SET last_document_id = ? WHERE user_id = ?', [last_document_id, userId]);
}

/**
 * Updates the editor_cursor_position attribute in the session for a user.
 * @param userId - The unique identifier of the user.
 * @param editor_cursor_position - The cursor position in the editor.
 */
export async function updateEditorCursorPosition(userId: number, editor_cursor_position: any) {
  if (typeof editor_cursor_position !== 'number' || !Number.isInteger(editor_cursor_position)) throw new Error('Invalid editor_cursor_position');
  await pool.query('UPDATE sessions SET editor_cursor_position = ? WHERE user_id = ?', [editor_cursor_position, userId]);
}

/**
 * Updates the editor_scroll_line attribute in the session for a user.
 * @param userId - The unique identifier of the user.
 * @param editor_scroll_line - The scroll line in the editor.
 */
export async function updateEditorScrollLine(userId: number, editor_scroll_line: any) {
  if (typeof editor_scroll_line !== 'number' || !Number.isInteger(editor_scroll_line)) throw new Error('Invalid editor_scroll_line');
  await pool.query('UPDATE sessions SET editor_scroll_line = ? WHERE user_id = ?', [editor_scroll_line, userId]);
}

/**
 * Updates the scroll_position attribute in the session for a user.
 * @param userId - The unique identifier of the user.
 * @param scroll_position - The scroll position value.
 */
export async function updateScrollPosition(userId: number, scroll_position: any) {
  if (typeof scroll_position !== 'number' || !Number.isInteger(scroll_position)) throw new Error('Invalid scroll_position');
  await pool.query('UPDATE sessions SET scroll_position = ? WHERE user_id = ?', [scroll_position, userId]);
}


/**
 * Retrieves a reduced list of users for messaging.
 * By default this function excludes users with role 'admin' to preserve the previous
 * behavior for ordinary users. When `includeAdmins` is true, the function returns
 * all users (including admins).
 *
 * Each returned object includes: user_id, first_name, last_name, email, role.
 *
 * @param includeAdmins - If true, include users with role 'admin' in the result.
 *                        Defaults to false to maintain backward compatibility.
 * @returns Array of reduced user objects.
 */
export async function getAllUsersReduced(includeAdmins: boolean = false): Promise<Array<{
  user_id: number,
  first_name: string,
  last_name: string,
  email: string,
  role: string
}>> {
  // If includeAdmins is true, include all users; otherwise exclude admins
  const sql = includeAdmins
    ? "SELECT user_id, first_name, last_name, email, role FROM users"
    : "SELECT user_id, first_name, last_name, email, role FROM users WHERE role != 'admin'";
  const [rows] = await pool.query(sql);
  return rows as Array<{
    user_id: number,
    first_name: string,
    last_name: string,
    email: string,
    role: string
  }>;
}


/**
 * Retrieves a user by their email address from the database.
 * @param email - The email address of the user.
 * @returns User object or null if not found.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return (rows as any[])[0] || null;
}

/**
 * Retrieves a local user (credential row) by their email address from the local_users table.
 *
 * This function is intended to centralize local-user lookups in the user service so
 * other modules (routes, auth handlers) can reuse a single implementation and type.
 *
 * Behavior and notes:
 * - Normalizes the email by trimming and lower-casing before lookup (assumes emails are stored normalized).
 * - Returns the full local_users row as an object when found, or null when not found.
 * - Caller should treat the returned object's `password_hash` as sensitive and never log it.
 * - If you already have a `getLocalUserByEmail` in another service (e.g., `session.service.ts`),
 *   remove or migrate that one to avoid duplicate implementations and exports.
 *
 * @param email - Email address to look up (will be trimmed and lowercased).
 * @returns A promise resolving to the local_users row (object) or null if none found.
 */
export async function getLocalUserByEmail(email: string): Promise<{
  user_id: number;
  email: string;
  password_hash: string;
  created_at?: string;
  updated_at?: string;
  // include any other columns your schema exposes
} | null> {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  const [rows] = await pool.query('SELECT * FROM local_users WHERE email = ?', [normalized]);
  return (rows as any[])[0] || null;
}

/**
 * Generates a memorable password for a new user.
 * The password consists of pronounceable syllables (easy to remember),
 * and is extended with four random digits for extra security.
 * Example output: "flomax9222"
 *
 * @param length - Base length of the memorable part (default: 6)
 * @returns A strong, memorable password string with base and 4 random digits.
 */
export function generateMemorablePassword(length: number = 6): string {
  // Generate base memorable password (letters only, easy to remember)
  const base = passwordGenerator(length, true);
  // Add four random digits (1000-9999, always 4 digits)
  const digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  // Combine all parts
  return `${base}${digits}`;
}

/**
 * Creates a new local user in the local_users table.
 * Used for local authentication (email/password).
 * Links the local user to the main users table via user_id (foreign key).
 * Stores hashed password and email for login.
 * @param localUser - Object containing local user attributes:
 *   - user_id: number (foreign key from users table)
 *   - email: string (user's email, unique for login)
 *   - password_hash: string (bcrypt hashed password)
 * @returns Newly created local user object, or null if creation failed.
 *
 * Note: created_at and updated_at are set automatically by the database schema.
 */
export async function createLocalUser(localUser: {
  user_id: number,
  email: string,
  password_hash: string
}): Promise<any | null> {
  const [result] = await pool.query(
    `INSERT INTO local_users (user_id, email, password_hash)
     VALUES (?, ?, ?)`,
    [
      localUser.user_id,
      localUser.email,
      localUser.password_hash
    ]
  );
  if ((result as any).affectedRows === 1) {
    return { ...localUser };
  }
  return null;
}

/**
 * Changes the password for a local user.
 * Only admin can change any user's password, others can change only their own.
 * @param userId - The unique identifier of the user.
 * @param passwordHash - The new hashed password.
 * @returns true if password changed, false otherwise.
 */
export async function changeLocalUserPassword(userId: number, passwordHash: string): Promise<boolean> {
  // Keep this update compatible with minimal schema by only updating password_hash here.
  const [result] = await pool.query(
    `UPDATE local_users SET password_hash = ? WHERE user_id = ?`,
    [passwordHash, userId]
  );
  return (result as any).affectedRows === 1;
}

/**
 * Retrieves only the role string for a given user_id.
 * Lightweight helper used when samo role treba (izbjegava fetch cijelog user objekta).
 * @param userId - numeric user_id
 * @returns role string ('student'|'mentor'|'admin'|...) or null if not found
 */
export async function getRoleById(userId: number): Promise<string | null> {
  if (!userId || typeof userId !== 'number') return null;
  const [rows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [userId]);
  const row = (rows as any[])[0];
  return row ? (row.role as string) : null;
}

/**
 * Retrieves all users from the database (including admins).
 * Used for admin dashboard user management.
 * @returns Array of all User objects
 */
export async function getAllUsers(): Promise<User[]> {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows as User[];
}

/**
 * Retrieves all active sessions for a specific user.
 * Returns session metadata including session_id, user_agent, ip_address, created_at, expires_at, last_activity.
 * @param userId - The user_id to query sessions for
 * @returns Array of session objects with metadata
 */
export async function getUserSessions(userId: number): Promise<any[]> {
  const [rows] = await pool.query(
    `SELECT session_id, user_id, user_agent, ip_address, created_at, expires_at, last_activity
     FROM sessions
     WHERE user_id = ? AND expires_at > NOW()
     ORDER BY last_activity DESC`,
    [userId]
  );
  return rows as any[];
}

/**
 * Deletes all sessions for a specific user (force logout).
 * Admin-only action to terminate all active sessions for a user.
 * @param userId - The user_id whose sessions will be deleted
 * @returns Number of sessions deleted
 */
export async function deleteAllUserSessions(userId: number): Promise<number> {
  const [result] = await pool.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
  return (result as any).affectedRows || 0;
}

/**
 * Updates the role for multiple users in a single transaction.
 * Used for bulk role assignment in admin dashboard.
 * @param userIds - Array of user_id values to update
 * @param newRole - New role value ('user', 'student', 'mentor', 'admin')
 * @returns Number of users updated
 */
export async function bulkUpdateUserRoles(userIds: number[], newRole: string): Promise<number> {
  if (!userIds || userIds.length === 0) return 0;
  
  // Validate role enum
  const validRoles = ['user', 'student', 'mentor', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`);
  }

  const placeholders = userIds.map(() => '?').join(',');
  const [result] = await pool.query(
    `UPDATE users SET role = ?, updated_at = NOW() WHERE user_id IN (${placeholders})`,
    [newRole, ...userIds]
  );
  return (result as any).affectedRows || 0;
}

/**
 * Retrieves all active sessions in the system with user information.
 * Used for admin session management dashboard.
 * @returns Array of sessions with joined user data (first_name, last_name, email, role)
 */
export async function getAllSessions(): Promise<any[]> {
  const [rows] = await pool.query(
    `SELECT 
      s.session_id, 
      s.user_id, 
      s.user_agent, 
      s.ip_address, 
      s.created_at, 
      s.expires_at, 
      s.last_activity,
      u.first_name,
      u.last_name,
      u.email,
      u.role
     FROM sessions s
     INNER JOIN users u ON s.user_id = u.user_id
     WHERE s.expires_at > NOW()
     ORDER BY s.last_activity DESC`
  );
  return rows as any[];
}
