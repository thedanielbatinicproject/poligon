import pool from '../db';
import { Document } from '../types/document';

// Helper: Valid status and language enums
const VALID_STATUS = ['draft', 'submitted', 'under_review', 'finished', 'graded'];
const VALID_LANGUAGE = ['hr', 'en'];

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
    // Insert
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
    if ('title' in updates && role === 'mentor') allowed.title = updates.title;
    // abstract: mentor or student who is editor
    if ('abstract' in updates) {
      const isEditor = await this.isEditor(document_id, user_id);
      if (role === 'mentor' || (role === 'student' && isEditor)) allowed.abstract = updates.abstract;
    }
    // latex_content: mentor or student who is editor
    if ('latex_content' in updates) {
      const isEditor = await this.isEditor(document_id, user_id);
      if (role === 'mentor' || (role === 'student' && isEditor)) allowed.latex_content = updates.latex_content;
    }
    // status: only mentor
    if ('status' in updates && role === 'mentor' && VALID_STATUS.includes(updates.status as string)) allowed.status = updates.status;
    // language: only mentor
    if ('language' in updates && role === 'mentor' && VALID_LANGUAGE.includes(updates.language as string)) allowed.language = updates.language;
    // grade: only mentor
    if ('grade' in updates && role === 'mentor') allowed.grade = updates.grade;
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
   * Only mentor or student who is editor can update.
   * @param document_id Document ID
   * @param latex_content New LaTeX content
   * @param role User role
   * @param user_id User ID
   * @returns Updated Document or null if not allowed
   */
  static async updateLatexContent(document_id: number, latex_content: string, role: string, user_id: number): Promise<Document | null> {
    const doc = await this.getDocumentById(document_id);
    if (!doc) return null;
    const isEditor = await this.isEditor(document_id, user_id);
    // Only mentor or student who is editor (created_by)
    if (role !== 'mentor' && !(role === 'student' && isEditor)) return null;
    await pool.query('UPDATE documents SET latex_content = ?, updated_at = NOW() WHERE document_id = ?', [latex_content, document_id]);
    return this.getDocumentById(document_id);
  }

  /**
   * Deletes a document from the database.
   * Admin can delete any document, mentor only documents they created.
   * @param document_id Document ID
   * @param role User role
   * @param user_id User ID
   * @returns true if deleted, false otherwise
   */
  static async deleteDocument(document_id: number, role: string, user_id: number): Promise<boolean> {
    const doc = await this.getDocumentById(document_id);
    if (!doc) return false;
    if (role === 'admin' || (role === 'mentor' && doc.created_by === user_id)) {
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
   * Checks if a user is an editor for a document.
   * @param document_id Document ID
   * @param user_id User ID
   * @returns true if user is editor, false otherwise
   */
  static async isEditor(document_id: number, user_id: number): Promise<boolean> {
    const editors = await this.getDocumentEditors(document_id);
    return editors.some(e => e.user_id === user_id);
  }

  /**
   * Gets all documents created by a specific mentor.
   * @param mentor_id Mentor user ID
   * @returns Array of Document objects
   */
  static async getMentorDocuments(mentor_id: number): Promise<Document[]> {
    const [rows] = await pool.query('SELECT * FROM documents WHERE created_by = ?', [mentor_id]);
    return rows as Document[];
  }
}
