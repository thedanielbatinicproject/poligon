import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { renderLatex } from '../render/renderer';
import { DocumentsService } from '../services/documents.service';
import pool from '../db';
import { io } from '../index';

const renderLocks: Map<number, boolean> = new Map(); // document_id -> rendering
// delete /temp/images recursively function helper
async function deleteDirRecursive(dirPath: string) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
}
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

// Helper: recursively copy all images from srcDir to destDir (flat, no subdirs)
async function copyImagesToWorkDir(srcDir: string, destDir: string) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.bmp', '.svg', '.webp'];
  try {
    await fs.mkdir(destDir, { recursive: true });
    const files = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of files) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (imageExts.includes(ext)) {
          const srcPath = path.join(srcDir, entry.name);
          const destPath = path.join(destDir, entry.name);
          try {
            await fs.copyFile(srcPath, destPath);
            console.log(`[IMAGE COPY] Copied to workDir: ${srcPath} -> ${destPath}`);
          } catch (e) {
            console.warn(`[IMAGE COPY] Failed to copy to workDir: ${srcPath} -> ${destPath}`, e);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[IMAGE COPY] Error copying images to workDir', e);
  }
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

      // Use uploads/{docId}/temp as workDir
      const uploadsDir = path.join(process.cwd(), 'uploads', String(documentId));
      const workDir = path.join(uploadsDir, 'temp');
      await fs.mkdir(workDir, { recursive: true });

      // Copy images from uploads/{docId}/ to workDir
      await copyImagesToWorkDir(uploadsDir, workDir);

      // Save .tex file in workDir
      const texPath = path.join(workDir, 'main.tex');
      await fs.writeFile(texPath, latexContent, 'utf8');

      // Debug: list all files in workDir before render
      try {
        const files = await fs.readdir(workDir);
        console.log('[renderWorker][DEBUG] Files in workDir before render:', files);
      } catch (e) {
        console.warn('[renderWorker][DEBUG] Could not list files in workDir', e);
      }

      // Render with configured timeout, using local renderer (isUrl=false), passing workDir
      const timeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 60000);
      const result = await renderLatex(latexContent, timeoutMs, false, workDir); // workDir ensures images and .tex are found
      console.debug('[renderWorker] renderLatex returned', { documentId, success: !!result?.success, error: result?.error ? String(result.error).slice(0, 200) : undefined, pdfSize: result?.pdf ? (result.pdf.length || 0) : 0 });

      if (!result.success || !result.pdf) {
        const errMsg = result.error || 'Unknown render failure';
        console.warn('[renderWorker] render failed', { documentId, err: errMsg });
        io.emit('document:render:finished', { document_id: documentId, success: false, error: errMsg, started_by: userId });
        return;
      }

      // Save PDF directly to uploads/{docId}/
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
      await fs.writeFile(absPath, result.pdf);
      console.debug('[renderWorker] wrote pdf file', { absPath });

      // insert version record into DB
      await DocumentsService.renderDocument(documentId, userId, latexContent, relPath);
      console.debug('[renderWorker] recorded version in DB', { documentId, relPath });

      // Clean up temp folder: keep only main.tex and temp-compile-*.pdf (if any), delete all else
      try {
        const files = await fs.readdir(workDir);
        for (const file of files) {
          // Keep main.tex and temp-compile-*.pdf, delete all else
          if (file === 'main.tex' || /^temp-compile-.*\.pdf$/.test(file)) continue;
          const filePath = path.join(workDir, file);
          try {
            await fs.unlink(filePath);
            console.log(`[renderWorker] Deleted temp file after mentor render: ${file}`);
          } catch (e) {
            console.warn(`[renderWorker] Failed to delete temp file after mentor render: ${file}`, e);
          }
        }
      } catch (e) {
        console.warn('[renderWorker] Could not clean up temp folder after mentor render', e);
      }

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

// --- RECURSIVE IMAGE COPY ---
const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.bmp', '.svg', '.webp'];

async function copyImagesRecursive(srcDir: string, destDir: string) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'temp') continue; // preskoči temp
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyImagesRecursive(srcPath, destPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (imageExts.includes(ext)) {
        console.log(`[IMAGE COPY] Trying to copy: ${srcPath} -> ${destPath}`);
        try {
          await fs.copyFile(srcPath, destPath);
          console.log(`[IMAGE COPY] Successfully copied: ${srcPath} -> ${destPath}`);
        } catch (e) {
          console.warn(`[IMAGE COPY] Failed to copy image: ${srcPath} -> ${destPath}`, e);
        }
      }
    }
  }
}

// TEMPORARY RENDER: same as startRender, but outputs to custom path and does NOT log version in DB
export async function startTempRender(documentId: number, userId: number, latexContent: string, outputPath: string): Promise<{ started: boolean; message?: string }> {
  if (isRendering(documentId)) return { started: false, message: 'Render already in progress for this document' };
  renderLocks.set(documentId, true);





  (async () => {
    const startedAt = new Date();
    // Paths
    const uploadsDir = path.join(process.cwd(), 'uploads', String(documentId));
    const tempDir = path.join(uploadsDir, 'temp');
    const pdfPath = outputPath;
    const workDir = tempDir; // Use uploads/{docId}/temp as workDir
    await fs.mkdir(workDir, { recursive: true });
    const texPath = path.join(workDir, 'main.tex');
    try {
      io.emit('document:temp-compile:started', { document_id: documentId, started_at: startedAt.toISOString(), started_by: userId });

      // Copy images from uploads/{docId}/ to tempDir (workDir)
      await copyImagesToWorkDir(uploadsDir, workDir);

      // Save .tex file in workDir
      await fs.writeFile(texPath, latexContent, 'utf8');

      // Debug: list all files in workDir before render
      try {
        const files = await fs.readdir(workDir);
        console.log('[renderWorker][DEBUG] Files in workDir before render:', files);
      } catch (e) {
        console.warn('[renderWorker][DEBUG] Could not list files in workDir', e);
      }

      // Render with configured timeout, using local renderer (isUrl=false), passing workDir
      const timeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 60000);
      const result = await renderLatex(latexContent, timeoutMs, false, workDir); // workDir ensures images and .tex are found
      console.log('[renderWorker] temp renderLatex returned', { documentId, success: !!result?.success, error: result?.error ? String(result.error).slice(0, 200) : undefined, pdfSize: result?.pdf ? (result.pdf.length || 0) : 0 });

      if (!result.success || !result.pdf) {
        const errMsg = result.error || 'Unknown render failure';
        io.emit('document:temp-compile:finished', { document_id: documentId, success: false, error: errMsg, started_by: userId });
        console.log('[renderWorker] temp render failed', { documentId, err: errMsg });
        return;
      }

      // Save new PDF
      await fs.writeFile(pdfPath, result.pdf);


      // Delete all files in workDir except the latest PDF
      try {
        const files = await fs.readdir(workDir);
        for (const file of files) {
          const filePath = path.join(workDir, file);
          if (filePath !== pdfPath) {
            try {
              await fs.unlink(filePath);
              console.log(`[renderWorker] Deleted temp file: ${file}`);
            } catch (e) {
              console.warn(`[renderWorker] Failed to delete temp file: ${file}`, e);
            }
          }
        }
      } catch (e) {
        console.warn('[renderWorker] Could not clean up temp folder after render', e);
      }

      io.emit('document:temp-compile:finished', { document_id: documentId, success: true, pdf_path: pdfPath, finished_at: new Date().toISOString(), started_by: userId });
    } catch (err: any) {
      try { await fs.unlink(texPath); } catch {}
      console.log('[renderWorker] temp render failed for document', documentId, err && err.stack ? err.stack : err);
      io.emit('document:temp-compile:finished', { document_id: documentId, success: false, error: String(err?.message || err), started_by: userId });
    } finally {
      renderLocks.delete(documentId);
    }
  })();

  return { started: true };
}
