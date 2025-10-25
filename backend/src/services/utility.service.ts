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
   * Fetches all tasks related to a specific document.
   * @param document_id - The ID of the document
   * @returns Array of task objects for the given document
  */
  static async getTasksByDocument(document_id: number): Promise<any[]> {
    const [rows] = await pool.query(
      'SELECT * FROM tasks WHERE document_id = ? ORDER BY created_at DESC',
      [document_id]
    );
    return rows as any[];
  }

  /**
   * Fetches all tasks created by or assigned to a specific user.
   * @param user_id - The ID of the user
   * @returns Array of task objects for the given user
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
}
