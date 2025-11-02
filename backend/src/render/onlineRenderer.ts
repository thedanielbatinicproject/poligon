import https from 'https';
import { URL } from 'url';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import pool from '../db';
import { DocumentsService } from '../services/documents.service';
// We'll accept socket.io instance via setter to avoid circular import
export let ioServer: any = null;
export function setIo(server: any) {
  ioServer = server;
}
import { AuditService } from '../services/audit.service';

// Local logger for this module: append logs to logs/OnlineRenderer.log
const ORIG_CONSOLE = console;
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'OnlineRenderer.log');

async function ensureLogDir(): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function formatArgs(args: any[]): string {
  try {
    return args
      .map((a) => {
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a);
        } catch (e) {
          return String(a);
        }
      })
      .join(' ');
  } catch (e) {
    return args.map((a) => String(a)).join(' ');
  }
}

async function writeLog(level: string, ...args: any[]) {
  try {
    await ensureLogDir();
    const line = `${new Date().toISOString()} [${level}] ${formatArgs(args)}\n`;
    await fs.appendFile(LOG_FILE, line);
  } catch (err) {
    // fallback to original console if file write fails
    ORIG_CONSOLE.error('[onlineRenderer] failed to write to log file', err);
  }
}

const localConsole = {
  debug: (...args: any[]) => {
    ORIG_CONSOLE.debug(...args);
    void writeLog('DEBUG', ...args);
  },
  warn: (...args: any[]) => {
    ORIG_CONSOLE.warn(...args);
    void writeLog('WARN', ...args);
  },
  error: (...args: any[]) => {
    ORIG_CONSOLE.error(...args);
    void writeLog('ERROR', ...args);
  },
  log: (...args: any[]) => {
    ORIG_CONSOLE.log(...args);
    void writeLog('LOG', ...args);
  }
};

const tempUrls: Map<string, { documentId: number; createdBy: number; expiresAt: number }> = new Map();
const renderLocks: Set<number> = new Set();

const CLEANUP_INTERVAL_MS = 5000;

function getEnv(name: string, def?: string) {
  return process.env[name] || def;
}

const EXTERNAL_RENDERER: string = (getEnv('EXTERNAL_RENDERER_URL', 'https://latexonline.cc') as string) || 'https://latexonline.cc';
const PUBLIC_URL: string = (getEnv('URL', 'http://localhost:5000') as string) || 'http://localhost:5000';
const RENDER_TIMEOUT_MS: number = Number(getEnv('RENDER_TIMEOUT_MS', '60000')) || 60000;

function makePublicUrl(token: string) {
  // public route without document id per spec
  return `${PUBLIC_URL.replace(/\/$/, '')}/latex-content/${token}`;
}

export function createTempUrl(documentId: number, userId: number): { token?: string; url?: string; expiresAt?: number; error?: string } {
  // Prevent starting render if document locked
  if (renderLocks.has(documentId)) return { error: 'Render already in progress for this document' };
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + RENDER_TIMEOUT_MS;
  tempUrls.set(token, { documentId, createdBy: userId, expiresAt });
  // Log the public token URL for debugging (helps local testing)
  try {
    localConsole.debug('[onlineRenderer] temp url created', { token, url: makePublicUrl(token), expiresAt });
  } catch (e) {}
  // reserve lock so another render can't start while token is valid
  renderLocks.add(documentId);
  return { token, url: makePublicUrl(token), expiresAt };
}

export async function validateAndGetLatex(token: string): Promise<string | null> {
  const meta = tempUrls.get(token);
  if (!meta) return null;
  if (Date.now() > meta.expiresAt) {
    // expired
    tempUrls.delete(token);
    renderLocks.delete(meta.documentId);
    return null;
  }
  const doc = await DocumentsService.getDocumentById(meta.documentId);
  if (!doc) return null;
  return doc.latex_content || '';
}

async function httpGetPdf(urlStr: string, timeoutMs: number): Promise<{ ok: boolean; buffer?: Buffer; statusCode?: number; text?: string }> {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const opts: any = { method: 'GET', timeout: timeoutMs };
      const req = https.request(url, opts, (res) => {
        const chunks: Buffer[] = [];
        const status = res.statusCode || 0;
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          const data = Buffer.concat(chunks);
          if (status >= 400) {
            // try to return textual body
            const txt = data.toString('utf8');
            return resolve({ ok: false, statusCode: status, text: txt });
          }
          resolve({ ok: true, buffer: data, statusCode: status });
        });
      });
      req.on('error', (e) => resolve({ ok: false, statusCode: 0, text: String(e) }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, statusCode: 0, text: 'timeout' });
      });
      req.end();
    } catch (err) {
      resolve({ ok: false, statusCode: 0, text: String(err) });
    }
  });
}

export async function startOnlineRender(token: string): Promise<{ started: boolean; message?: string }> {
  const meta = tempUrls.get(token);
  if (!meta) return { started: false, message: 'Invalid or expired token' };
  const { documentId, createdBy } = meta;
  // If somehow not locked (should be locked at create), ensure lock now
  if (renderLocks.has(documentId) === false) renderLocks.add(documentId);

  // spawn async task
  (async () => {
    const startedAt = new Date().toISOString();
    try {
  if (ioServer && typeof ioServer.emit === 'function') ioServer.emit('document:render:started', { document_id: documentId, started_at: startedAt, started_by: createdBy });

      const publicUrl = makePublicUrl(token);
      const compileUrl = `${EXTERNAL_RENDERER.replace(/\/$/, '')}/compile?url=${encodeURIComponent(publicUrl)}&format=pdf&force=true`;
  localConsole.debug('[onlineRenderer] calling external renderer', { documentId, compileUrl });

      const resp = await httpGetPdf(compileUrl, RENDER_TIMEOUT_MS);
  if (!resp.ok || !resp.buffer) {
    const errMsg = resp.text || `status=${resp.statusCode}`;
  localConsole.warn('[onlineRenderer] external render failed', { documentId, err: errMsg });
  if (ioServer && typeof ioServer.emit === 'function') ioServer.emit('document:render:finished', { document_id: documentId, success: false, error: String(errMsg) });
        return;
      }

      // validate PDF header
      if (resp.buffer.slice(0, 4).toString() !== '%PDF') {
    const txt = resp.buffer.toString('utf8').slice(0, 1000);
    localConsole.warn('[onlineRenderer] external renderer did not return PDF', { documentId, sample: txt.slice(0, 300) });
  if (ioServer && typeof ioServer.emit === 'function') ioServer.emit('document:render:finished', { document_id: documentId, success: false, error: 'External service did not return PDF.' });
        return;
      }

      // ensure uploads dir
      const uploadsDir = path.join(process.cwd(), 'uploads', String(documentId));
      await fs.mkdir(uploadsDir, { recursive: true });

      // fetch user display name
      let userRow: any = null;
      try {
        const [rows] = await pool.query('SELECT user_id, display_name, first_name, last_name FROM users WHERE user_id = ?', [createdBy]);
        userRow = (rows as any[])[0] || null;
      } catch (err) {
        // ignore
      }
      const display = (userRow && (userRow.display_name || `${userRow.first_name || ''}_${userRow.last_name || ''}`)) || `user_${createdBy}`;
      const iso = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `PoligonDocRender-${documentId}-AT-${iso}-BY-${display}.pdf`;
      const relPath = path.join('uploads', String(documentId), filename);
      const absPath = path.join(process.cwd(), relPath);

      await fs.writeFile(absPath, resp.buffer);

      // snapshot latex content (get document)
      const doc = await DocumentsService.getDocumentById(documentId);
      const latexSnapshot = doc?.latex_content || '';
      await DocumentsService.renderDocument(documentId, createdBy, latexSnapshot, relPath);

      if (ioServer && typeof ioServer.emit === 'function') ioServer.emit('document:render:finished', { document_id: documentId, success: true, pdf_path: relPath, finished_at: new Date().toISOString(), started_by: createdBy });
      // audit log for successful compile
      try {
        await AuditService.createAuditLog({ user_id: createdBy, action_type: 'compile', entity_type: 'document', entity_id: documentId });
      } catch (e) {
        localConsole.warn('[onlineRenderer] audit log failed', e);
      }
    } catch (err) {
  localConsole.error('[onlineRenderer] render failed', documentId, err && (err as any).stack ? (err as any).stack : err);
  if (ioServer && typeof ioServer.emit === 'function') ioServer.emit('document:render:finished', { document_id: documentId, success: false, error: String((err as any)?.message || err) });
    } finally {
      // cleanup token and lock
      try {
        tempUrls.forEach((v, k) => {
          if (v.documentId === documentId) tempUrls.delete(k);
        });
      } catch (e) {}
      renderLocks.delete(documentId);
      localConsole.debug('[onlineRenderer] finished cleanup', { documentId });
    }
  })();

  return { started: true };
}

// Periodic cleanup of expired tokens
setInterval(() => {
  try {
    const now = Date.now();
    for (const [token, meta] of tempUrls.entries()) {
      if (now > meta.expiresAt) {
        tempUrls.delete(token);
        // free lock if present
        renderLocks.delete(meta.documentId);
        localConsole.debug('[onlineRenderer] cleaned expired token', { token, documentId: meta.documentId });
      }
    }
  } catch (err) {
    // ignore
  }
}, CLEANUP_INTERVAL_MS);

export function isRendering(documentId: number): boolean {
  return renderLocks.has(documentId);
}
