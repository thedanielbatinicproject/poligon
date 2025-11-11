// TEMPORARY RENDER: same as startRender, but outputs to custom path and does NOT log version in DB
export async function startTempRender(documentId: number, userId: number, latexContent: string, outputPath: string): Promise<{ started: boolean; message?: string }> {
  if (isRendering(documentId)) return { started: false, message: 'Render already in progress for this document' };
  renderLocks.set(documentId, true);

  (async () => {
    const startedAt = new Date();
    // Paths
    const tempDir = path.join(process.cwd(), 'uploads', String(documentId), 'temp');
    const texPath = path.join(tempDir, 'render.tex');
    const pdfPath = outputPath;
    try {
      io.emit('document:temp-compile:started', { document_id: documentId, started_at: startedAt.toISOString(), started_by: userId });

      // Ensure temp dir exists
      await fs.mkdir(tempDir, { recursive: true });

      // Save .tex file
      await fs.writeFile(texPath, latexContent, 'utf8');

      // Prepare public URL to .tex file for latexonline.cc
      // e.g. https://poligon.live/api/uploads/{document_id}/temp/render.tex
      const baseUrl = process.env.BASE_URL || 'https://poligon.live';
      const texUrl = `${baseUrl}/api/uploads/${documentId}/temp/render.tex`;

      // Find and delete old temp PDF if render is successful (afterwards)
      let oldTempPdf: string | null = null;
      try {
        const files = await fs.readdir(tempDir);
        for (const f of files) {
          if (f.endsWith('.pdf')) {
            const full = path.join(tempDir, f);
            if (full !== pdfPath) oldTempPdf = full;
          }
        }
      } catch {}

      // Render with configured timeout, using .tex URL
      const timeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 60000);
      const result = await renderLatex(texUrl, timeoutMs, true); // true = isUrl
      console.log('[renderWorker] temp renderLatex returned', { documentId, success: !!result?.success, error: result?.error ? String(result.error).slice(0, 200) : undefined, pdfSize: result?.pdf ? (result.pdf.length || 0) : 0 });

      // Always delete .tex after render attempt
      try { await fs.unlink(texPath); } catch {}

      if (!result.success || !result.pdf) {
        const errMsg = result.error || 'Unknown render failure';
        io.emit('document:temp-compile:finished', { document_id: documentId, success: false, error: errMsg, started_by: userId });
        console.log('[renderWorker] temp render failed', { documentId, err: errMsg });
        return;
      }

      // Delete old temp PDF if exists (only on success)
      if (oldTempPdf && oldTempPdf !== pdfPath) {
        try { await fs.unlink(oldTempPdf); } catch {}
      }

      // Save new PDF
      await fs.writeFile(pdfPath, result.pdf);

      io.emit('document:temp-compile:finished', { document_id: documentId, success: true, pdf_path: pdfPath, finished_at: new Date().toISOString(), started_by: userId });
    } catch (err: any) {
      // Always delete .tex after render attempt
      try { await fs.unlink(texPath); } catch {}
      console.log('[renderWorker] temp render failed for document', documentId, err && err.stack ? err.stack : err);
      io.emit('document:temp-compile:finished', { document_id: documentId, success: false, error: String(err?.message || err), started_by: userId });
    } finally {
      renderLocks.delete(documentId);
    }
  })();

  return { started: true };
}
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { renderLatex } from '../render/renderer';
import { DocumentsService } from '../services/documents.service';
import pool from '../db';
import { io } from '../index';

const renderLocks: Map<number, boolean> = new Map(); // document_id -> rendering

// Helper: format timestamp for Zagreb timezone in DD_MM_YYYY-HH_MM_SS format
function formatZagrebTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${day}_${month}_${year}-${hh}_${mm}_${ss}`;
}

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
        io.emit('document:render:finished', { document_id: documentId, success: false, error: errMsg, started_by: userId });
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

      const timestamp = formatZagrebTimestamp();
      const filename = `PoligonDocRender-DocID(${documentId})-@${timestamp}-BY-${display}.pdf`;
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
      io.emit('document:render:finished', { document_id: documentId, success: false, error: String(err?.message || err), started_by: userId });
    } finally {
      renderLocks.delete(documentId);
      console.debug('[renderWorker] cleared render lock', { documentId });
    }
  })();

  return { started: true };
}
