// Minimal API client for backend calls. Uses credentials: 'include' so server session cookie is sent.
// Avoid referencing `process` directly in the browser. Prefer (in order):
// 1) injected env via process.env (when available), 2) a window global `__POLIGON_API_BASE__`, 3) empty string (same-origin)
const API_BASE: string = (
  (typeof process !== 'undefined' && (process as any)?.env?.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && (window as any).__POLIGON_API_BASE__) ||
  ''
) as string;

async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function postJSON(path: string, body: any) {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  } catch (fetchErr: any) {
    const msg = `Network error fetching ${API_BASE + path}: ${fetchErr?.message ?? fetchErr}`;
    const err: any = new Error(msg);
    err.status = 0;
    err.body = null;
    // surface underlying error for debugging
    err.original = fetchErr;
    throw err;
  }
  const data = await parseResponse(res);
  if (!res.ok) {
    // Normalize error: attach a readable message where possible
    let message = 'Request failed';
    try {
      if (data && typeof data === 'object') {
        message = data.error ?? data.message ?? JSON.stringify(data);
      } else if (typeof data === 'string') {
        message = data;
      }
    } catch (e) {
      /* ignore */
    }
    const err: any = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function getJSON(path: string) {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
  } catch (fetchErr: any) {
    const msg = `Network error fetching ${API_BASE + path}: ${fetchErr?.message ?? fetchErr}`;
    const err: any = new Error(msg);
    err.status = 0;
    err.body = null;
    err.original = fetchErr;
    throw err;
  }
  const data = await parseResponse(res);
  if (!res.ok) {
    let message = 'Request failed';
    try {
      if (data && typeof data === 'object') {
        message = data.error ?? data.message ?? JSON.stringify(data);
      } else if (typeof data === 'string') {
        message = data;
      }
    } catch (e) {}
    const err: any = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// High-level endpoints
export const api = {
  loginLocal: (payload: { email: string; password: string }) => postJSON('/api/auth/login-local', payload),
  status: () => getJSON('/api/status'),
  logout: () => postJSON('/api/auth/logout', {}),
};

export default api;
