import pool from '../db';

export type AuditLogActionType = 'edit' | 'submit' | 'grade' | 'comment' | 'upload' | 'compile' | 'delete' | 'create';
export type AuditLogEntityType = 'document' | 'file' | 'task';

export interface CreateAuditLogParams {
  user_id: number;
  action_type: AuditLogActionType;
  entity_type: AuditLogEntityType;
  entity_id: number;
}

export class AuditService {
  /**
   * Creates a new audit log entry.
   */
  static async createAuditLog(params: CreateAuditLogParams): Promise<void> {
    const { user_id, action_type, entity_type, entity_id } = params;
    await pool.query(
      `INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, action_timestamp)
       VALUES (?, ?, ?, ?, NOW())`,
      [user_id, action_type, entity_type, entity_id]
    );
  }

  /**
   * Deletes audit log entries by array of audit_id. Only for admin usage.
   */
  static async deleteAuditLogs(auditIds: number[]): Promise<number> {
    if (!Array.isArray(auditIds) || auditIds.length === 0) return 0;
    const placeholders = auditIds.map(() => '?').join(',');
    const [result]: any = await pool.query(
      `DELETE FROM audit_log WHERE audit_id IN (${placeholders})`,
      auditIds
    );
    return result.affectedRows || 0;
  }

  static async getAuditLogForDocument(documentId: number): Promise<any[]> {
    const [rows] = await pool.query(
      `SELECT * FROM audit_log WHERE entity_type = 'document' AND entity_id = ? ORDER BY action_timestamp DESC`,
      [documentId]
    );
    return rows as any[];
  }

  static async getAllAuditLogs(): Promise<any[]> {
    const [rows] = await pool.query(
      `SELECT * FROM audit_log ORDER BY action_timestamp DESC`
    );
    return rows as any[];
  }

  
}
