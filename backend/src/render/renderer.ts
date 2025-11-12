import { renderWithWasm, WasmRenderResult, wasmAvailable } from './wasmRenderer';
import https from 'https';
import { URL } from 'url';

export interface RenderResult {
  success: boolean;
  pdf?: Buffer;
  log?: string;
  error?: string;
}

/**
 * Attempt render via WASM first; if that fails and external renders are allowed,
 * optionally call a public HTTP render service as a fallback.
 */
// If isUrl is true, treat latexContent as a URL to a .tex file
export async function renderLatex(latexContent: string, timeoutMs: number, isUrl = false): Promise<RenderResult> {
  // Try WASM only if not using URL
  if (!isUrl) {
    try {
      const wasmRes: WasmRenderResult = await renderWithWasm(latexContent, timeoutMs);
      if (wasmRes.success && wasmRes.pdf) return { success: true, pdf: wasmRes.pdf, log: wasmRes.log };
      // if wasm returned error or not success, continue to fallback
      const wasmErr = wasmRes.error || wasmRes.log || 'WASM render failed';
      const allowExternal = (process.env.ALLOW_EXTERNAL_RENDER || 'false').toLowerCase() === 'true';
      if (!allowExternal) return { success: false, error: `WASM renderer failed: ${wasmErr}` };
    } catch (err) {
      const allowExternal = (process.env.ALLOW_EXTERNAL_RENDER || 'false').toLowerCase() === 'true';
      if (!allowExternal) return { success: false, error: `WASM renderer threw: ${String(err)}` };
    }
  }

  // Fallback: use latexonline.cc (public) if allowed. If isUrl, send as url param.
  const allowExternal = (process.env.ALLOW_EXTERNAL_RENDER || 'false').toLowerCase() === 'true';
  if (!allowExternal) return { success: false, error: 'WASM renderer failed and external render not allowed.' };

  try {
    const pdf = await renderViaLatexOnline(latexContent, timeoutMs, isUrl);
    return { success: true, pdf };
  } catch (err: any) {
    return { success: false, error: `External render failed - ${String(err)}` };
  }
}

function renderViaLatexOnline(source: string, timeoutMs: number, isUrl = false): Promise<Buffer> {
  // latexonline.cc API: if isUrl, use GET with ?url=... else POST with {source: ...}
  return new Promise((resolve, reject) => {
    try {
      let url: URL;
      let req: any;
      // Helper to extract and format only the relevant error message
      function formatLatexError(raw: string, statusCode: number): string {
        // Find the first 'error:' (case-insensitive)
        const match = raw.match(/error:/i);
        let msg = raw;
        if (match) {
          msg = raw.slice(match.index! + 6).trim();
        }
        // Replace all sequences of colons/whitespace with ' - '
        msg = msg.replace(/[:]+/g, ' - ');
        // Remove leading/trailing dashes and whitespace
        msg = msg.replace(/^[\s\-]+|[\s\-]+$/g, '');
        // If nothing left, fallback to status
        if (!msg) msg = `LaTeX compilation failed (status ${statusCode})`;
        return msg;
      }
      if (isUrl) {
        url = new URL('https://latexonline.cc/compile');
        url.searchParams.set('format', 'pdf');
        url.searchParams.set('url', source);
        req = https.get(url, { timeout: timeoutMs }, (res) => {
          const chunks: Buffer[] = [];
          if (res.statusCode && res.statusCode >= 400) {
            const errorChunks: Buffer[] = [];
            res.on('data', (c) => errorChunks.push(Buffer.from(c)));
            res.on('end', () => {
              const errorBody = Buffer.concat(errorChunks).toString('utf8');
              const formatted = formatLatexError(errorBody, res.statusCode!);
              reject(new Error(formatted));
            });
            return;
          }
          res.on('data', (c) => chunks.push(Buffer.from(c)));
          res.on('end', () => {
            const data = Buffer.concat(chunks);
            if (data.slice(0, 4).toString() !== '%PDF') return reject(new Error('External service did not return a PDF.'));
            resolve(data);
          });
        });
        req.on('error', (e: any) => reject(e));
      } else {
        url = new URL('https://latexonline.cc/compile');
        url.searchParams.set('format', 'pdf');
        req = https.request(url, { method: 'POST', timeout: timeoutMs, headers: { 'Content-Type': 'text/plain' } }, (res) => {
          const chunks: Buffer[] = [];
          if (res.statusCode && res.statusCode >= 400) {
            const errorChunks: Buffer[] = [];
            res.on('data', (c) => errorChunks.push(Buffer.from(c)));
            res.on('end', () => {
              const errorBody = Buffer.concat(errorChunks).toString('utf8');
              const formatted = formatLatexError(errorBody, res.statusCode!);
              reject(new Error(formatted));
            });
            return;
          }
          res.on('data', (c) => chunks.push(Buffer.from(c)));
          res.on('end', () => {
            const data = Buffer.concat(chunks);
            if (data.slice(0, 4).toString() !== '%PDF') return reject(new Error('External service did not return a PDF.'));
            resolve(data);
          });
        });
        req.on('error', (e: any) => reject(e));
        req.write(source);
        req.end();
      }
    } catch (err) {
      reject(err);
    }
  });
}
