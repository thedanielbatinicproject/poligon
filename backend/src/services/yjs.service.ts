import * as Y from 'yjs';
import pool from '../db/index';

/**
 * YjsService handles Yjs document state persistence and retrieval
 * Manages CRDT state storage for real-time collaborative editing
 */
export class YjsService {
  /**
   * Load Yjs state from database
   * Returns null if no state exists (new document)
   */
  static async loadYjsState(documentId: number): Promise<Uint8Array | null> {
    try {
      const [rows] = await pool.query(
        'SELECT yjs_state FROM yjs_documents WHERE document_id = ?',
        [documentId]
      );
      
      if ((rows as any[]).length === 0) {
        return null;
      }
      
      const state = (rows as any[])[0].yjs_state;
      return state ? new Uint8Array(state) : null;
    } catch (err) {
      console.error('[YjsService] Failed to load yjs state:', err);
      return null;
    }
  }

  /**
   * Save Yjs state to database
   * Creates or updates the yjs_documents record
   */
  static async saveYjsState(documentId: number, state: Uint8Array): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO yjs_documents (document_id, yjs_state, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE yjs_state = VALUES(yjs_state), updated_at = NOW()`,
        [documentId, Buffer.from(state)]
      );
    } catch (err) {
      console.error('[YjsService] Failed to save yjs state:', err);
      throw err;
    }
  }

  /**
   * Save incremental update to yjs_updates table (optional - for history replay)
   */
  static async saveYjsUpdate(documentId: number, update: Uint8Array): Promise<void> {
    try {
      await pool.query(
        'INSERT INTO yjs_updates (document_id, yjs_update, created_at) VALUES (?, ?, NOW())',
        [documentId, Buffer.from(update)]
      );
    } catch (err) {
      console.error('[YjsService] Failed to save yjs update:', err);
      // Non-fatal: update history is optional
    }
  }

  /**
   * Initialize Yjs document from database or from latex_content
   */
  static async initializeYjsDocument(documentId: number): Promise<Y.Doc> {
    const ydoc = new Y.Doc();
    
    // Try to load existing Yjs state
    const savedState = await this.loadYjsState(documentId);
    
    if (savedState) {
      // Restore from saved Yjs state
      Y.applyUpdate(ydoc, savedState);
      console.log(`[YjsService] Restored Yjs state for document ${documentId}`);
    } else {
      // Initialize from latex_content in documents table
      try {
        const [rows] = await pool.query(
          'SELECT latex_content FROM documents WHERE document_id = ?',
          [documentId]
        );
        
        if ((rows as any[]).length > 0) {
          const latexContent = (rows as any[])[0].latex_content || '';
          const ytext = ydoc.getText('latex');
          ytext.insert(0, latexContent);
          
          // Save initial state
          await this.saveYjsState(documentId, Y.encodeStateAsUpdate(ydoc));
          console.log(`[YjsService] Initialized Yjs document ${documentId} from latex_content`);
        }
      } catch (err) {
        console.error('[YjsService] Failed to initialize from latex_content:', err);
      }
    }
    
    return ydoc;
  }

  /**
   * Sync Yjs document content back to documents.latex_content
   * This ensures backwards compatibility with non-Yjs parts of the system
   */
  static async syncToLatexContent(documentId: number, ydoc: Y.Doc): Promise<void> {
    try {
      const ytext = ydoc.getText('latex');
      const latexContent = ytext.toString();
      
      await pool.query(
        'UPDATE documents SET latex_content = ?, updated_at = NOW() WHERE document_id = ?',
        [latexContent, documentId]
      );
      
      console.log(`[YjsService] Synced Yjs document ${documentId} to latex_content`);
    } catch (err) {
      console.error('[YjsService] Failed to sync to latex_content:', err);
    }
  }

  /**
   * Delete Yjs state when document is deleted
   */
  static async deleteYjsState(documentId: number): Promise<void> {
    try {
      await pool.query('DELETE FROM yjs_documents WHERE document_id = ?', [documentId]);
      await pool.query('DELETE FROM yjs_updates WHERE document_id = ?', [documentId]);
    } catch (err) {
      console.error('[YjsService] Failed to delete yjs state:', err);
    }
  }
}
