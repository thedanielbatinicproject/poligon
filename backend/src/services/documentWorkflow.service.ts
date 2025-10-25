import pool from '../db';

export type WorkflowStatus = 'draft' | 'submitted' | 'under_review' | 'finished' | 'graded';

export interface WorkflowEvent {
  workflow_id: number;
  document_id: number;
  status: WorkflowStatus;
  changed_by: number;
  changed_at: Date;
}

export class DocumentWorkflowService {
  /**
   * Adds a new workflow event (status change) for a document.
   * @param document_id Document ID
   * @param status New status to set
   * @param changed_by User ID who changed the status
   * @returns Promise<void>
   */
  static async addWorkflowEvent(document_id: number, status: WorkflowStatus, changed_by: number): Promise<void> {
    await pool.query(
      `INSERT INTO workflow_history (document_id, status, changed_by, changed_at)
       VALUES (?, ?, ?, NOW())`,
      [document_id, status, changed_by]
    );
  }

  /**
   * Gets all workflow events for a document, ordered by changed_at ascending.
   * @param document_id Document ID
   * @returns Array of workflow events
   */
  static async getWorkflowHistory(document_id: number): Promise<WorkflowEvent[]> {
    const [rows] = await pool.query(
      `SELECT * FROM workflow_history WHERE document_id = ? ORDER BY changed_at ASC`,
      [document_id]
    );
    return rows as WorkflowEvent[];
  }

  /**
   * Gets the latest workflow status for a document.
   * @param document_id Document ID
   * @returns Latest status or null if not found
   */
  static async getLatestStatus(document_id: number): Promise<WorkflowStatus | null> {
    const [rows] = await pool.query(
      `SELECT status FROM workflow_history WHERE document_id = ? ORDER BY changed_at DESC LIMIT 1`,
      [document_id]
    );
    return (rows as any[])[0]?.status || null;
  }
}
