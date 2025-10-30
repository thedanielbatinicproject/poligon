import pool from '../db';
import { User } from '../types/user';

export class UtilityService {
  /**
   * Adds a new task to the tasks table.
   * @param data - Object with task data (created_by, task_title, task_status are required)
   * is document_id is left undefined, task will be treated as GLOBAL task and not document-tied
   * @returns ID of the newly created task
  */
  static async addTask(data: {
    created_by: number,
    assigned_to?: number | null,
    document_id?: number | null,
    task_title: string,
    task_description?: string,
    task_status: 'open' | 'closed'
  }): Promise<number> {
    if (!data.created_by || !data.task_title || !data.task_status) {
      throw new Error('created_by, task_title, and task_status are required');
    }
    const [result] = await pool.query(
      `INSERT INTO tasks (created_by, assigned_to, document_id, task_title, task_description, task_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.created_by,
        data.assigned_to ?? null,
        data.document_id ?? null,
        data.task_title,
        data.task_description ?? '',
        data.task_status
      ]
    );
    return (result as any).insertId;
  }

  /**
   * Updates an existing task.
   * @param task_id - ID of the task to update
   * @param updates - Object with fields to update (task_title, task_description, assigned_to, document_id, task_status)
   * @returns true if update was successful, false otherwise
  */
  static async updateTask(task_id: number, updates: {
    task_title?: string,
    task_description?: string,
    assigned_to?: number | null,
    document_id?: number | null,
    task_status?: 'open' | 'closed'
  }): Promise<boolean> {
    const allowedFields = ['task_title', 'task_description', 'assigned_to', 'document_id', 'task_status'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    if (fields.length === 0) return false;
    const setClause = fields.map(key => `${key} = ?`).join(', ');
    const values = fields.map(key => (updates as any)[key]);
    values.push(task_id);
    const [result] = await pool.query(
      `UPDATE tasks SET ${setClause}, updated_at = NOW() WHERE task_id = ?`,
      values
    );
    return (result as any).affectedRows > 0;
  }

  /**
   * Deletes a task from the table by ID.
   * @param task_id - ID of the task to delete
   * @returns true if deletion was successful, false otherwise
  */
  static async deleteTask(task_id: number): Promise<boolean> {
    const [result] = await pool.query('DELETE FROM tasks WHERE task_id = ?', [task_id]);
    return (result as any).affectedRows > 0;
  }

  /**
   * Retrieves all tasks associated with a specific document.
   * Each returned object represents a task and includes:
   * - task_id: Unique identifier for the task
   * - created_by: User ID of the task creator
   * - assigned_to: User ID of the assigned user (nullable)
   * - document_id: ID of the related document (nullable)
   * - task_title: Title of the task
   * - task_description: Detailed description of the task
   * - task_status: Current status ('open' or 'closed')
   * - created_at: Timestamp when the task was created
   * - updated_at: Timestamp when the task was last updated
   * Results are ordered by creation date, newest first.
   * @param document_id - The ID of the document to filter tasks by
   * @returns Array of task objects linked to the specified document
  */
  static async getTasksByDocument(document_id: number): Promise<any[]> {
    const [rows] = await pool.query(
      'SELECT * FROM tasks WHERE document_id = ? ORDER BY created_at DESC',
      [document_id]
    );
    return rows as any[];
  }

  /**
   * Retrieves all tasks either created by or assigned to a specific user.
   * Each returned object represents a task and includes:
   * - task_id: Unique identifier for the task
   * - created_by: User ID of the task creator
   * - assigned_to: User ID of the assigned user (nullable)
   * - document_id: ID of the related document (nullable)
   * - task_title: Title of the task
   * - task_description: Detailed description of the task
   * - task_status: Current status ('open' or 'closed')
   * - created_at: Timestamp when the task was created
   * - updated_at: Timestamp when the task was last updated
   * Results are ordered by creation date, newest first.
   * @param user_id - The ID of the user to filter tasks by
   * @returns Array of task objects created by or assigned to the specified user
  */
  static async getTasksByUser(user_id: number): Promise<any[]> {
    const [rows] = await pool.query(
      `SELECT * FROM tasks
      WHERE created_by = ? OR assigned_to = ?
      ORDER BY created_at DESC`,
      [user_id, user_id]
    );
    return rows as any[];
  }

  /**
   * Retrieves a single task by its unique identifier.
   * The returned object includes all columns from the tasks table:
   * - task_id: Unique identifier for the task
   * - created_by: User ID of the task creator
   * - assigned_to: User ID of the assigned user (nullable)
   * - document_id: ID of the related document (nullable)
   * - task_title: Title of the task
   * - task_description: Detailed description of the task
   * - task_status: Current status ('open' or 'closed')
   * - created_at: Timestamp when the task was created
   * - updated_at: Timestamp when the task was last updated
   * @param task_id - The ID of the task to retrieve
   * @returns The task object if found, or null if no task exists with the given ID
   */
  static async getTaskById(task_id: number): Promise<any | null> {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE task_id = ?', [task_id]);
    return (rows as any[])[0] || null;
  }

  //USER MESSAGES
  /**
   * Inserts a new user-to-user message into the database.
   * @param sender_id - User ID of the sender
   * @param receiver_id - User ID of the receiver
   * @param message_content - Text content of the message
   * @returns The unique message_id of the newly created message
  */
  static async addMessage(sender_id: number, receiver_id: number, message_content: string): Promise<number> {
    const [result] = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message_content, sent_at)
      VALUES (?, ?, ?, NOW())`,
      [sender_id, receiver_id, message_content]
    );
    return (result as any).insertId;
  }

  /**
   * Deletes a message by its unique identifier.
   * Only the sender or receiver of the message is authorized to delete it.
   * @param message_id - The unique ID of the message to delete
   * @param user_id - The user requesting deletion (must be sender or receiver)
   * @returns True if the message was deleted, false if not found or not authorized
   */
  static async deleteMessage(message_id: number, user_id: number): Promise<boolean> {
    // Check if the user is either the sender or receiver of the message
    const [rows] = await pool.query(
      `SELECT * FROM messages WHERE message_id = ? AND (sender_id = ? OR receiver_id = ?)`,
      [message_id, user_id, user_id]
    );
    if ((rows as any[]).length === 0) return false;
    const [result] = await pool.query(
      `DELETE FROM messages WHERE message_id = ?`,
      [message_id]
    );
    return (result as any).affectedRows > 0;
  }

  /**
   * Retrieves a single message from the database by its unique identifier.
   * The returned object includes all columns from the messages table:
   * - message_id: Unique identifier for the message
   * - sender_id: User ID of the sender
   * - receiver_id: User ID of the receiver
   * - message_content: Text content of the message
   * - sent_at: Timestamp when the message was sent
   * @param message_id - The unique ID of the message to retrieve
   * @returns The message object if found, or null if no message exists with the given ID
  */
  static async getMessageById(message_id: number): Promise<any | null> {
    const [rows] = await pool.query('SELECT * FROM messages WHERE message_id = ?', [message_id]);
    return (rows as any[])[0] || null;
  }


  /**
   * Retrieves all messages exchanged between two users, ordered by sent time ascending.
   * Each returned object includes:
   * - message_id: Unique identifier for the message
   * - sender_id: User ID of the sender
   * - receiver_id: User ID of the receiver
   * - message_content: Text content of the message
   * - sent_at: Timestamp when the message was sent
   * @param user1_id - The first user's ID
   * @param user2_id - The second user's ID
   * @returns Array of message objects representing the conversation history between the two users
  */
  static async getMessagesBetweenUsers(user1_id: number, user2_id: number): Promise<Array<{
    message_id: number,
    sender_id: number,
    receiver_id: number,
    message_content: string,
    sent_at: Date
  }>> {
    const [rows] = await pool.query(
      `SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY sent_at ASC`,
      [user1_id, user2_id, user2_id, user1_id]
    );
    return rows as Array<{
      message_id: number,
      sender_id: number,
      receiver_id: number,
      message_content: string,
      sent_at: Date
    }>;
  }

  /**
 * Updates one or more session columns in the `sessions` table for a given user.
 * Only allowed keys are updated. The function builds a dynamic UPDATE query and
 * validates types/lengths before writing to the DB.
 *
 * @param userId - user_id owning the session rows to update
 * @param attrs - partial object with any of:
 *   last_route?: string,
 *   last_document_id?: number,
 *   editor_cursor_position?: number,
 *   editor_scroll_line?: number,
 *   scroll_position?: number,
 *   sidebar_state?: 'open' | 'closed',
 *   theme?: 'light' | 'dark' | 'auto'
 *
 * @returns number of affected rows (0 or 1) - resolves to 1 on success
 */
static async updateSessionAttributes(userId: number, attrs: Partial<{
  last_route: string;
  last_document_id: number;
  editor_cursor_position: number;
  editor_scroll_line: number;
  scroll_position: number;
  sidebar_state: 'open' | 'closed';
  theme: 'light' | 'dark' | 'auto';
}>): Promise<number> {
  if (!userId || typeof userId !== 'number') {
    throw new Error('Invalid userId');
  }

  // Allowed keys and per-key validation
  const setters: string[] = [];
  const values: any[] = [];

  if ('last_route' in attrs) {
    const v = attrs.last_route;
    if (typeof v !== 'string' || v.length > 255) throw new Error('Invalid last_route');
    setters.push('last_route = ?');
    values.push(v);
  }

  if ('last_document_id' in attrs) {
    const v = attrs.last_document_id;
    if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error('Invalid last_document_id');
    setters.push('last_document_id = ?');
    values.push(v);
  }

  if ('editor_cursor_position' in attrs) {
    const v = attrs.editor_cursor_position;
    if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error('Invalid editor_cursor_position');
    setters.push('editor_cursor_position = ?');
    values.push(v);
  }

  if ('editor_scroll_line' in attrs) {
    const v = attrs.editor_scroll_line;
    if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error('Invalid editor_scroll_line');
    setters.push('editor_scroll_line = ?');
    values.push(v);
  }

  if ('scroll_position' in attrs) {
    const v = attrs.scroll_position;
    if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error('Invalid scroll_position');
    setters.push('scroll_position = ?');
    values.push(v);
  }

  if ('sidebar_state' in attrs) {
    const v = attrs.sidebar_state;
    if (v !== 'open' && v !== 'closed') throw new Error('Invalid sidebar_state');
    setters.push('sidebar_state = ?');
    values.push(v);
  }

  if ('theme' in attrs) {
    const v = attrs.theme;
    if (v !== 'light' && v !== 'dark' && v !== 'auto') throw new Error('Invalid theme');
    setters.push('theme = ?');
    values.push(v);
  }

  if (setters.length === 0) {
    // nothing to do
    return 0;
  }

  // Always touch last_activity to reflect change
  setters.push('last_activity = NOW()');

  const sql = `UPDATE sessions SET ${setters.join(', ')} WHERE user_id = ?`;
  values.push(userId);

  const [result] = await pool.query(sql, values);
  const affected = (result as any).affectedRows || 0;
  return affected;
}

}
