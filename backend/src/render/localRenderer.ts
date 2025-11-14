

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { RenderResult } from './renderer';

// Set to true to enable debug logging for local renderer
const DEBUG_LOCAL_RENDERER = process.env.DEBUG_LOCAL_RENDERER === 'true';

/**
 * Render LaTeX to PDF using local TeX Live CLI (pdflatex/xelatex).
 * Returns a RenderResult with PDF buffer or error/log.
 */
export async function renderWithLocalLatex(
  latexContent: string,
  timeoutMs: number,
  engine: 'pdflatex' | 'xelatex' = 'pdflatex',
  workDirOverride?: string
): Promise<RenderResult> {
  const tmpBase = path.join(os.tmpdir(), 'poligon-latex');
  if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] Using tmpBase:', tmpBase);
  await fs.mkdir(tmpBase, { recursive: true });
  let workDir: string;
  let createdWorkDir = false;
  if (workDirOverride) {
    workDir = workDirOverride;
    if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] Using provided workDir:', workDir);
    // Assume caller created and populated workDir
  } else {
    const renderId = `render_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
    workDir = path.join(tmpBase, renderId);
    if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] workDir:', workDir);
    await fs.mkdir(workDir, { recursive: true });
    createdWorkDir = true;
  }
  const texPath = path.join(workDir, 'main.tex');
  const pdfPath = path.join(workDir, 'main.pdf');
  const logPath = path.join(workDir, 'main.log');
  try {
    // Only write .tex if we created the workDir; if provided, assume caller wrote it
    if (!workDirOverride) {
      await fs.writeFile(texPath, latexContent, 'utf8');
      if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] Written tex file:', texPath);
    }
    // Run TeX engine
    const args = [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-output-directory', workDir,
      texPath
    ];
    if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] Spawning', engine, args);
    const proc = spawn(engine, args, { cwd: workDir });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const exitPromise = new Promise<number>((resolve, reject) => {
      proc.on('error', (err) => {
        if (DEBUG_LOCAL_RENDERER) console.error('[localRenderer] spawn error:', err);
        reject(err);
      });
      proc.on('exit', (code) => {
        if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] TeX engine exited with code', code);
        resolve(code ?? -1);
      });
    });
    // Timeout logic
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      if (DEBUG_LOCAL_RENDERER) console.error('[localRenderer] TeX engine timed out');
      proc.kill('SIGKILL');
    }, timeoutMs);
    const exitCode = await exitPromise;
    clearTimeout(timeout);
    if (timedOut) {
      if (DEBUG_LOCAL_RENDERER) console.error('[localRenderer] Timeout, stdout:', stdout, 'stderr:', stderr);
      return { success: false, error: 'TeX engine timed out', log: stdout + '\n' + stderr };
    }
    // Check for PDF
    let pdf: Buffer | undefined = undefined;
    try {
      pdf = await fs.readFile(pdfPath);
      if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] PDF produced:', pdfPath, 'size:', pdf.length);
    } catch (e) {
      if (DEBUG_LOCAL_RENDERER) console.error('[localRenderer] PDF not produced:', e);
    }
    // Read log if available
    let log = '';
    try {
      log = await fs.readFile(logPath, 'utf8');
      if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] Log file read:', logPath);
    } catch (e) {
      if (DEBUG_LOCAL_RENDERER) console.error('[localRenderer] Log file not found:', e);
    }
    if (exitCode === 0 && pdf) {
      if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] Render success');
      return { success: true, pdf, log };
    } else {
      if (DEBUG_LOCAL_RENDERER) console.error('[localRenderer] Render failed, exitCode:', exitCode, 'log:', log, 'stdout:', stdout, 'stderr:', stderr);
      return { success: false, error: 'TeX engine failed', log: log || stdout + '\n' + stderr };
    }
  } catch (err: any) {
    if (DEBUG_LOCAL_RENDERER) console.error('[localRenderer] Exception:', err);
    return { success: false, error: String(err && err.message ? err.message : err) };
  } finally {
    // Cleanup temp dir only if we created it
    if (createdWorkDir) {
      try { await fs.rm(workDir, { recursive: true, force: true }); if (DEBUG_LOCAL_RENDERER) console.log('[localRenderer] Cleaned up', workDir); } catch {}
    }
  }
}
