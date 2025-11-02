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
export async function renderLatex(latexContent: string, timeoutMs: number): Promise<RenderResult> {
  // Try WASM
  try {
    const wasmRes: WasmRenderResult = await renderWithWasm(latexContent, timeoutMs);
    if (wasmRes.success && wasmRes.pdf) return { success: true, pdf: wasmRes.pdf, log: wasmRes.log };
    // if wasm returned error or not success, continue to fallback
    const wasmErr = wasmRes.error || wasmRes.log || 'WASM render failed';
    // If external not allowed, return wasm error
    const allowExternal = (process.env.ALLOW_EXTERNAL_RENDER || 'false').toLowerCase() === 'true';
    if (!allowExternal) return { success: false, error: `WASM renderer failed: ${wasmErr}` };
  } catch (err) {
    const allowExternal = (process.env.ALLOW_EXTERNAL_RENDER || 'false').toLowerCase() === 'true';
    if (!allowExternal) return { success: false, error: `WASM renderer threw: ${String(err)}` };
  }

  // Fallback: use latexonline.cc (public) if allowed. This is a simple POST of source.
  const allowExternal = (process.env.ALLOW_EXTERNAL_RENDER || 'false').toLowerCase() === 'true';
  if (!allowExternal) return { success: false, error: 'WASM renderer failed and external render not allowed.' };

  try {
    const pdf = await renderViaLatexOnline(latexContent, timeoutMs);
    return { success: true, pdf };
  } catch (err: any) {
    return { success: false, error: `External render failed: ${String(err)}` };
  }
}

function renderViaLatexOnline(source: string, timeoutMs: number): Promise<Buffer> {
  // latexonline.cc API: POST /compile with {source: '...'} returns PDF directly for some endpoints.
  // We'll call latexonline.cc/compile with query format=pdf
  return new Promise((resolve, reject) => {
    try {
      const url = new URL('https://latexonline.cc/compile');
      url.searchParams.set('format', 'pdf');
      const req = https.request(url, { method: 'POST', timeout: timeoutMs, headers: { 'Content-Type': 'text/plain' } }, (res) => {
        const chunks: Buffer[] = [];
        if (res.statusCode && res.statusCode >= 400) return reject(new Error(`latexonline responded ${res.statusCode}`));
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          const data = Buffer.concat(chunks);
          // latexonline may return HTML on error; try to detect PDF header %PDF
          if (data.slice(0, 4).toString() !== '%PDF') return reject(new Error('External service did not return a PDF.'));
          resolve(data);
        });
      });
      req.on('error', (e) => reject(e));
      req.write(source);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}
