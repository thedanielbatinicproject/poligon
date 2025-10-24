import pool from '../db';
import { Document } from '../types/document';

// Helper: Valid status and language enums
const VALID_STATUS = ['draft', 'submitted', 'under_review', 'finished', 'graded'];
const VALID_LANGUAGE = ['hr', 'en'];
const MENTOR_ROLE = 'mentor';

export class DocumentsService {
  /**
   * Creates a new document (thesis) in the database.
   * Only admin or mentor can create documents.
   * Validates input before SQL insert.
   * @param data Partial document data
   * @returns Newly created Document or null if validation fails
   */
  static async createDocument(data: Partial<Document>): Promise<Document | null> {
    // Validate required fields
    if (!data.type_id || !data.title || !data.created_by) return null;
    if (typeof data.title !== 'string' || data.title.length > 255) return null;
    if (data.language && !VALID_LANGUAGE.includes(data.language)) return null;
    if (data.status && !VALID_STATUS.includes(data.status)) return null;
    // Insert document
    const [result] = await pool.query(
      `INSERT INTO documents (type_id, title, abstract, latex_content, compiled_pdf_path, status, language, grade, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.type_id,
        data.title,
        data.abstract || '',
        data.latex_content || '',
        data.compiled_pdf_path || '',
        data.status || 'draft',
        data.language || 'hr',
        data.grade ?? null,
        data.created_by
      ]
    );
    const insertId = (result as any).insertId;
    // Add creator as owner/editor in document_editors
    await pool.query(
      `INSERT INTO document_editors (document_id, user_id, role, added_by) VALUES (?, ?, 'owner', ?, NOW())`,
      [insertId, data.created_by, data.created_by]
    );
    return this.getDocumentById(insertId);
  }

  /**
   * Edits document details (except latex_content).
   * Role-based validation: mentor can edit most fields, student can edit abstract/latex_content if editor.
   * type_id cannot be changed. Backend-only fields are not editable.
   * @param document_id Document ID
   * @param updates Fields to update
   * @param role User role
   * @param user_id User ID
   * @returns Updated Document or null if not allowed
   */
  static async editDocument(document_id: number, updates: Partial<Document>, role: string, user_id: number): Promise<Document | null> {
    const doc = await this.getDocumentById(document_id);
    if (!doc) return null;
    const allowed: any = {};
    // type_id cannot be changed
    // title: only mentor
    if ('title' in updates && role === MENTOR_ROLE) allowed.title = updates.title;
    // abstract: mentor or student/editor
    if ('abstract' in updates) {
      const isEditor = await this.isEditor(document_id, user_id, ['editor', 'owner', MENTOR_ROLE]);
      if (role === MENTOR_ROLE || isEditor) allowed.abstract = updates.abstract;
    }
    // latex_content: mentor or student/editor
    if ('latex_content' in updates) {
      const isEditor = await this.isEditor(document_id, user_id, ['editor', 'owner', MENTOR_ROLE]);
      if (role === MENTOR_ROLE || isEditor) allowed.latex_content = updates.latex_content;
    }
    // status: only mentor
    if ('status' in updates && role === MENTOR_ROLE && VALID_STATUS.includes(updates.status as string)) allowed.status = updates.status;
    // language: only mentor
    if ('language' in updates && role === MENTOR_ROLE && VALID_LANGUAGE.includes(updates.language as string)) allowed.language = updates.language;
    // grade: only mentor
    if ('grade' in updates && role === MENTOR_ROLE) allowed.grade = updates.grade;
    // compiled_pdf_path: backend only, not editable
    // created_by, created_at, updated_at: not editable
    if (Object.keys(allowed).length === 0) return doc; // nothing to update
    // Build update query
    const fields = Object.keys(allowed).map(key => `${key} = ?`).join(', ');
    const values = Object.values(allowed);
    await pool.query(`UPDATE documents SET ${fields}, updated_at = NOW() WHERE document_id = ?`, [...values, document_id]);
    return this.getDocumentById(document_id);
  }

  /**
   * Updates latex_content for a document.
   * Only mentor or student/editor can update.
   * @param document_id Document ID
   * @param latex_content New LaTeX content
   * @param role User role
   * @param user_id User ID
   * @returns Updated Document or null if not allowed
   */
  static async updateLatexContent(document_id: number, latex_content: string, role: string, user_id: number): Promise<Document | null> {
    const doc = await this.getDocumentById(document_id);
    if (!doc) return null;
    const isEditor = await this.isEditor(document_id, user_id, ['editor', 'owner', MENTOR_ROLE]);
    if (role !== MENTOR_ROLE && !isEditor) return null;
    await pool.query('UPDATE documents SET latex_content = ?, updated_at = NOW() WHERE document_id = ?', [latex_content, document_id]);
    return this.getDocumentById(document_id);
  }

  /**
   * Deletes a document and all related data from the database.
   * Removes from: documents, document_editors, document_versions, workflow_history, tasks.
   * Sets document_id to NULL in file_uploads and sessions for related records.
   * Admin can delete any document, mentor only documents where is editor/mentor/owner.
   * @param document_id Document ID
   * @param role User role
   * @param user_id User ID
   * @returns true if deleted, false otherwise
   */
  static async deleteDocument(document_id: number, role: string, user_id: number): Promise<boolean> {
    const doc = await this.getDocumentById(document_id);
    if (!doc) return false;
    const isMentorOrOwner = await this.isEditor(document_id, user_id, ['owner', MENTOR_ROLE]);
    if (role === 'admin' || (role === MENTOR_ROLE && isMentorOrOwner)) {
      // Delete from related tables
      await pool.query('DELETE FROM document_editors WHERE document_id = ?', [document_id]);
      await pool.query('DELETE FROM document_versions WHERE document_id = ?', [document_id]);
      await pool.query('DELETE FROM workflow_history WHERE document_id = ?', [document_id]);
      await pool.query('DELETE FROM tasks WHERE document_id = ?', [document_id]);
      // Set document_id to NULL in file_uploads and sessions
      await pool.query('UPDATE file_uploads SET document_id = NULL WHERE document_id = ?', [document_id]);
      await pool.query('UPDATE sessions SET document_id = NULL WHERE document_id = ?', [document_id]);
      // Delete document itself
      await pool.query('DELETE FROM documents WHERE document_id = ?', [document_id]);
      return true;
    }
    return false;
  }

  /**
   * Gets a document by its ID.
   * @param document_id Document ID
   * @returns Document object or null if not found
   */
  static async getDocumentById(document_id: number): Promise<Document | null> {
    const [rows] = await pool.query('SELECT * FROM documents WHERE document_id = ?', [document_id]);
    if ((rows as any[]).length === 0) return null;
    return (rows as any[])[0] || null;
  }

  /**
   * Gets all editors for a document.
   * @param document_id Document ID
   * @returns Array of editor objects (user_id, role, added_by, added_at)
   */
  static async getDocumentEditors(document_id: number): Promise<Array<{ user_id: number; role: string; added_by: number; added_at: Date | string }>> {
    const [rows] = await pool.query(
      'SELECT user_id, role, added_by, added_at FROM document_editors WHERE document_id = ?',
      [document_id]
    );
    return rows as Array<{ user_id: number; role: string; added_by: number; added_at: Date | string }>;
  }

  /**
   * Checks if a user is an editor/mentor/owner for a document.
   * @param document_id Document ID
   * @param user_id User ID
   * @param roles Array of roles to check (e.g. ['mentor','editor','owner'])
   * @returns true if user has one of the roles, false otherwise
   */
  static async isEditor(document_id: number, user_id: number, roles: string[] = ['editor','owner','mentor']): Promise<boolean> {
    const editors = await this.getDocumentEditors(document_id);
    return editors.some(e => e.user_id === user_id && roles.includes(e.role));
  }

  /**
   * Gets all documents for a user with a specific role (e.g. mentor, editor, owner).
   * @param user_id User ID
   * @param role Role to filter (e.g. 'mentor')
   * @returns Array of Document objects
   */
  static async getUserDocumentsByRole(user_id: number, role: string): Promise<Document[]> {
    const [rows] = await pool.query(
      `SELECT d.* FROM documents d
       JOIN document_editors de ON d.document_id = de.document_id
       WHERE de.user_id = ? AND de.role = ?`,
      [user_id, role]
    );
    return rows as Document[];
  }
}
