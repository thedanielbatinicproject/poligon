import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { renderLatex } from '../render/renderer';
import { DocumentsService } from '../services/documents.service';
import pool from '../db';
import { io } from '../index';

const renderLocks: Map<number, boolean> = new Map(); // document_id -> rendering

export function isRendering(documentId: number): boolean {
  const locked = !!renderLocks.get(documentId);
  try {
    console.debug('[renderWorker] isRendering check', { documentId, locked });
  } catch (_) {}
  return locked;
}

function safeDisplayName(userRow: any): string {
  if (!userRow) return 'unknown';
  if (userRow.display_name) return String(userRow.display_name).replace(/\s+/g, '_');
  if (userRow.first_name || userRow.last_name) return `${String(userRow.first_name || '')}_${String(userRow.last_name || '')}`.replace(/\s+/g, '_');
  return `user_${userRow.user_id}`;
}

export async function startRender(documentId: number, userId: number): Promise<{ started: boolean; message?: string }> {
  if (isRendering(documentId)) return { started: false, message: 'Render already in progress for this document' };
  renderLocks.set(documentId, true);

  // run async (don't await here from caller)
  (async () => {
    const startedAt = new Date();
    console.debug('[renderWorker] startRender called', { documentId, userId, startedAt: startedAt.toISOString() });
    try {
      io.emit('document:render:started', { document_id: documentId, started_at: startedAt.toISOString(), started_by: userId });

      const doc = await DocumentsService.getDocumentById(documentId);
      console.debug('[renderWorker] fetched document', { documentId, found: !!doc });
      if (!doc) throw new Error('Document not found');

      const latexContent = doc.latex_content || '';
      console.debug('[renderWorker] latex snapshot length', { documentId, length: (latexContent || '').length });

      // render with configured timeout
      const timeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 60000);
      console.debug('[renderWorker] calling renderLatex', { documentId, timeoutMs });
      const result = await renderLatex(latexContent, timeoutMs);
      console.debug('[renderWorker] renderLatex returned', { documentId, success: !!result?.success, error: result?.error ? String(result.error).slice(0, 200) : undefined, pdfSize: result?.pdf ? (result.pdf.length || 0) : 0 });

      if (!result.success || !result.pdf) {
        const errMsg = result.error || 'Unknown render failure';
        console.warn('[renderWorker] render failed', { documentId, err: errMsg });
        io.emit('document:render:finished', { document_id: documentId, success: false, error: errMsg });
        return;
      }

      // ensure uploads folder
      const uploadsDir = path.join(process.cwd(), 'uploads', String(documentId));
      console.debug('[renderWorker] ensuring uploads dir', { uploadsDir });
      await fs.mkdir(uploadsDir, { recursive: true });

      // fetch user display name
      let userRow: any = null;
      try {
        const [rows] = await pool.query('SELECT user_id, display_name, first_name, last_name FROM users WHERE user_id = ?', [userId]);
        userRow = (rows as any[])[0] || null;
        console.debug('[renderWorker] fetched userRow', { userId, hasRow: !!userRow });
      } catch (err) {
        console.warn('[renderWorker] failed to fetch userRow, will fallback to id', { userId, err });
        // ignore, fallback to id
      }
      const display = safeDisplayName(userRow);

      const iso = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `PoligonDocRender-${documentId}-AT-${iso}-BY-${display}.pdf`;
      const relPath = path.join('uploads', String(documentId), filename);
      const absPath = path.join(process.cwd(), relPath);
      console.debug('[renderWorker] writing pdf file', { absPath, relPath, filename });

      // write file
      await fs.writeFile(absPath, result.pdf);
      console.debug('[renderWorker] wrote pdf file', { absPath });

      // insert version record into DB
      await DocumentsService.renderDocument(documentId, userId, latexContent, relPath);
      console.debug('[renderWorker] recorded version in DB', { documentId, relPath });

      io.emit('document:render:finished', { document_id: documentId, success: true, pdf_path: relPath, finished_at: new Date().toISOString(), started_by: userId });
      console.debug('[renderWorker] render finished success', { documentId, relPath });
    } catch (err: any) {
      console.error('[renderWorker] render failed for document', documentId, err && err.stack ? err.stack : err);
      io.emit('document:render:finished', { document_id: documentId, success: false, error: String(err?.message || err) });
    } finally {
      renderLocks.delete(documentId);
      console.debug('[renderWorker] cleared render lock', { documentId });
    }
  })();

  return { started: true };
}
