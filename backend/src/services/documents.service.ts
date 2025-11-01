import pool from '../db';
import { Document } from '../types/document';
import { WorkflowStatus } from './documentWorkflow.service';

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
    // added_at has DEFAULT CURRENT_TIMESTAMP in schema, no need to explicitly insert NOW()
    await pool.query(
      `INSERT INTO document_editors (document_id, user_id, role, added_by) VALUES (?, ?, 'owner', ?)`,
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
    // type_id can be changed by a mentor (was previously immutable)
    if ('type_id' in updates && role === MENTOR_ROLE) {
      const tid = Number(updates.type_id);
      if (!isNaN(tid)) {
        // validate that the type exists
        const typeExists = await this.getDocumentTypeById(tid);
        if (typeExists) allowed.type_id = tid;
      }
    }
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
   * @returns true if user has one of the roles on the requested document, false otherwise
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

  /**
   * Adds an editor to a document.
   * Only owner (creator) or admin can add editors.
   * @param document_id Document ID
   * @param user_id_to_add User ID to add as editor
   * @param role Role to assign ('editor', 'viewer', 'mentor')
   * @param added_by User ID who is adding
   * @returns true if added, false otherwise
   */
  static async addEditor(document_id: number, user_id_to_add: number, role: string, added_by: number): Promise<boolean> {
    // Provjeri je li osoba koja dodaje admin ili owner
    const [docRows] = await pool.query('SELECT created_by FROM documents WHERE document_id = ?', [document_id]);
    if ((docRows as any[]).length === 0) return false;
    const created_by = (docRows as any[])[0].created_by;
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [added_by]);
    const isAdmin = (userRows as any[])[0]?.role === 'admin';
    if (added_by !== created_by && !isAdmin) return false;
    // Dodaj editor entry
    // added_at defaults to CURRENT_TIMESTAMP
    await pool.query(
      'INSERT INTO document_editors (document_id, user_id, role, added_by) VALUES (?, ?, ?, ?)',
      [document_id, user_id_to_add, role, added_by]
    );
    return true;
  }

  /**
   * Removes an editor from a document.
   * Only owner (creator) or admin can remove editors.
   * @param document_id Document ID
   * @param user_id_to_remove User ID to remove as editor
   * @param requester_id User ID who is requesting removal
   * @returns true if removed, false otherwise
   */
  static async removeEditor(document_id: number, user_id_to_remove: number, requester_id: number): Promise<boolean> {
    // Provjeri je li osoba koja miče admin ili owner
    const [docRows] = await pool.query('SELECT created_by FROM documents WHERE document_id = ?', [document_id]);
    if ((docRows as any[]).length === 0) return false;
    const created_by = (docRows as any[])[0].created_by;
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [requester_id]);
    const isAdmin = (userRows as any[])[0]?.role === 'admin';
    // Prevent the document owner from removing themselves as an editor.
    // Owners may remove other editors, and admins may remove owners, but an owner
    // cannot remove their own owner/editor entry (this avoids accidental lockout).
    if (user_id_to_remove === created_by && requester_id === created_by) return false;
    if (requester_id !== created_by && !isAdmin) return false;
    // Izbriši editor entry
    await pool.query('DELETE FROM document_editors WHERE document_id = ? AND user_id = ?', [document_id, user_id_to_remove]);
    return true;
  }

  static async renderDocument(document_id: number, user_id: number, latex_snapshot: string, pdfPath: string): Promise<void> {
        // 1. Logging into document_versions
        const [rows] = await pool.query(
            'SELECT MAX(version_number) AS max_version FROM document_versions WHERE document_id = ?',
            [document_id]
        );
        const nextVersion = ((rows as any[])[0]?.max_version || 0) + 1;
        await pool.query(
            `INSERT INTO document_versions (document_id, version_number, edited_by, latex_snapshot, compiled_pdf_path, edited_at)
            VALUES (?, ?, ?, ?, ?, NOW())`,
            [document_id, nextVersion, user_id, latex_snapshot, pdfPath]
        );
        // 2. Logging into workflow_history (status: 'finished')
        // Handled in documents.routes
        // 3. Logging in audit_log (action_type: 'compile')
        // Already handled in documents.routes
  }

  /**
   * Retrieves all version records for a specific document.
   * Each version includes version number, editor, LaTeX snapshot, PDF path, and edit timestamp.
   * Only versions for the given document_id are returned, ordered by version_number ascending.
   *
   * @param {number} document_id - The ID of the document to fetch versions for.
   * @returns {Promise<any[]>} Array of version objects for the document.
   *
   * Example version object:
   * {
   *   version_id: number,
   *   document_id: number,
   *   version_number: number,
   *   edited_by: number,
   *   latex_snapshot: string,
   *   compiled_pdf_path: string,
   *   edited_at: Date
   * }
  */
  static async getDocumentVersions(document_id: number): Promise<any[]> {
    const [rows] = await pool.query(
      'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number ASC',
      [document_id]
    );
    return rows as any[];
  }

  /**
   * Gets a specific version for a document by document_id and version_id.
   * @param {number} document_id - Document ID
   * @param {number} version_id - Version ID
   * @returns {Promise<any | null>} Version object or null if not found
  */
  static async getDocumentVersionById(document_id: number, version_id: number): Promise<any | null> {
    const [rows] = await pool.query(
      'SELECT * FROM document_versions WHERE document_id = ? AND version_id = ? LIMIT 1',
      [document_id, version_id]
    );
    return (rows as any[])[0] || null;
  }

  /**
   * Fetches the current status of a document from the documents table.
   * @param {number} document_id - Document ID
   * @returns {Promise<string | null>} Status string or null if not found
  */
  static async getDocumentStatus(document_id: number): Promise<WorkflowStatus | null> {
    const [rows] = await pool.query(
      'SELECT status FROM documents WHERE document_id = ? LIMIT 1',
      [document_id]
    );
    const status = (rows as any[])[0]?.status || null;
    const validStatuses: WorkflowStatus[] = ['draft', 'submitted', 'under_review', 'finished', 'graded'];
    return validStatuses.includes(status as WorkflowStatus) ? (status as WorkflowStatus) : null;
  }

  /**
   * Updates the status of a document in the documents table.
   * Only allows valid WorkflowStatus values.
   * @param {number} document_id - Document ID
   * @param {WorkflowStatus} newStatus - New status to set
   * @returns {Promise<boolean>} True if updated, false otherwise
  */
  static async updateDocumentStatus(document_id: number, newStatus: WorkflowStatus): Promise<boolean> {
    const validStatuses: WorkflowStatus[] = ['draft', 'submitted', 'under_review', 'finished', 'graded'];
    if (!validStatuses.includes(newStatus)) return false;
    const [result] = await pool.query(
      'UPDATE documents SET status = ?, updated_at = NOW() WHERE document_id = ?',
      [newStatus, document_id]
    );
    return (result as any).affectedRows > 0;
  }

  /**
   * Updates the grade of a document in the documents table.
   * Only allows grades from 1 to 100 (or null to remove grade).
   * @param {number} document_id - Document ID
   * @param {number | null} newGrade - New grade to set (1-100 or null)
   * @returns {Promise<boolean>} True if updated, false otherwise
   */
  static async updateDocumentGrade(document_id: number, newGrade: number | null): Promise<boolean> {
    if (newGrade !== null && (newGrade < 1 || newGrade > 100)) return false;
    const [result] = await pool.query(
      'UPDATE documents SET grade = ?, updated_at = NOW() WHERE document_id = ?',
      [newGrade, document_id]
    );
    return (result as any).affectedRows > 0;
  }


  /**
   * Gets all document types from the database.
   * Each object contains: type_id, type_name, description.
   * @returns {Promise<Array<{type_id: number, type_name: string, description: string}>>}
   *
   * Example:
   * [
   *   { type_id: 1, type_name: 'thesis', description: 'Final thesis document' },
   *   { type_id: 2, type_name: 'report', description: 'Project report' }
   * ]
   */
  static async getAllDocumentTypes(): Promise<Array<{type_id: number, type_name: string, description: string}>> {
    const [rows] = await pool.query('SELECT * FROM document_types ORDER BY type_id ASC');
    return rows as Array<{type_id: number, type_name: string, description: string}>;
  }

  /**
   * Gets a single document type by its ID.
   * @param {number} type_id - Document type ID
   * @returns {Promise<{type_id: number, type_name: string, description: string} | null>}
   *
   * Example:
   * { type_id: 1, type_name: 'thesis', description: 'Final thesis document' }
   */
  static async getDocumentTypeById(type_id: number): Promise<{type_id: number, type_name: string, description: string} | null> {
    const [rows] = await pool.query('SELECT * FROM document_types WHERE type_id = ? LIMIT 1', [type_id]);
    return (rows as any[])[0] || null;
  }

  /**
   * Creates a new document type.
   * @param {string} type_name - Name of the document type (e.g. 'thesis')
   * @param {string} description - Description or metadata (e.g. 'Final thesis document')
   * @returns {Promise<number>} Newly created type_id
   *
   * Example: returns 3 if new type_id is 3
   */
  static async createDocumentType(type_name: string, description: string): Promise<number> {
    const [result] = await pool.query(
      'INSERT INTO document_types (type_name, description) VALUES (?, ?)',
      [type_name, description]
    );
    return (result as any).insertId;
  }

  /**
   * Updates an existing document type.
   * @param {number} type_id - Document type ID
   * @param {string} type_name - New name (e.g. 'report')
   * @param {string} description - New description (e.g. 'Project report')
   * @returns {Promise<boolean>} True if updated, false otherwise
   */
  static async updateDocumentType(type_id: number, type_name: string, description: string): Promise<boolean> {
    const [result] = await pool.query(
      'UPDATE document_types SET type_name = ?, description = ? WHERE type_id = ?',
      [type_name, description, type_id]
    );
    return (result as any).affectedRows > 0;
  }

  /**
   * Deletes a document type by its ID and sets type_id to NULL in documents referencing this type.
   * @param {number} type_id - Document type ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async deleteDocumentType(type_id: number): Promise<boolean> {
  // Set type_id to NULL in documents referencing this type
  await pool.query('UPDATE documents SET type_id = NULL WHERE type_id = ?', [type_id]);
  // Delete the document type itself
  const [result] = await pool.query('DELETE FROM document_types WHERE type_id = ?', [type_id]);
  return (result as any).affectedRows > 0;
  }
}
