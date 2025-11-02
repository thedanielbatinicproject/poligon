import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * WASM renderer wrapper.
 * Tries to load a WASM-based TeX engine if available (tectonic-wasm, tex-wasm, etc.).
 * If not available, throws a helpful error.
 */
export async function wasmAvailable(): Promise<boolean> {
  try {
    // Try a few common package names (may not be installed)
    // We use dynamic import to avoid hard dependency.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await Promise.resolve().then(() => require('tectonic-wasm'));
    return true;
  } catch (e) {
    try {
      await Promise.resolve().then(() => require('tex-wasm'));
      return true;
    } catch (err) {
      return false;
    }
  }
}

export interface WasmRenderResult {
  success: boolean;
  pdf?: Buffer;
  log?: string;
  error?: string;
}

/**
 * Render LaTeX using an installed WASM TeX engine.
 * This function attempts to use one of the known WASM packages. If none found
 * it returns an error explaining how to install one.
 */
export async function renderWithWasm(latexContent: string, timeoutMs: number): Promise<WasmRenderResult> {
  // Quick availability check
  const available = await wasmAvailable();
  if (!available) {
    return { success: false, error: 'No WASM TeX engine found. Install a package like `tectonic-wasm` or `tex-wasm`.' };
  }

  // Try tectonic-wasm first
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tectonic = require('tectonic-wasm');
    if (tectonic && typeof tectonic.compile === 'function') {
      // Many WASM packages expose different APIs; this tries a common one
      const result: any = await Promise.race([
        tectonic.compile(latexContent),
        new Promise((_, rej) => setTimeout(() => rej(new Error('WASM render timeout')), timeoutMs))
      ]);
      // result may contain .pdf (Uint8Array) and .log
      const pdfBuf = result.pdf ? Buffer.from(result.pdf) : undefined;
      return { success: !!pdfBuf, pdf: pdfBuf, log: result.log ? String(result.log) : undefined };
    }
  } catch (err) {
    // continue to next try
  }

  // Try tex-wasm style package
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const texWasm = require('tex-wasm');
    if (texWasm && typeof texWasm.compile === 'function') {
      const api = texWasm;
      const result: any = await Promise.race([
        api.compile(latexContent),
        new Promise((_, rej) => setTimeout(() => rej(new Error('WASM render timeout')), timeoutMs))
      ]);
      const pdfBuf = result.pdf ? Buffer.from(result.pdf) : undefined;
      return { success: !!pdfBuf, pdf: pdfBuf, log: result.log ? String(result.log) : undefined };
    }
  } catch (err) {
    // fallthrough
  }

  return { success: false, error: 'WASM renderer packages found but none matched a known API. Check installed package docs.' };
}
