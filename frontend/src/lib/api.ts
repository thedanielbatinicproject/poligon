export async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })

  const contentType = res.headers.get('content-type') || ''
  let body: any = null
  if (contentType.includes('application/json')) {
    body = await res.json()
  } else {
    body = await res.text()
  }

  if (!res.ok) {
    const err: any = new Error('API error')
    err.status = res.status
    err.body = body
    // notify global notifier if available
    try {
      const msg = (body && typeof body === 'object' && (body.error || body.message)) || String(body) || 'Request failed'
      if ((window as any).__pushNotification) {
        ;(window as any).__pushNotification(String(msg), undefined, true)
      }
    } catch (e) {
      /* ignore notifier errors */
    }
    throw err
  }

  return body
}

// Minimal API client for backend calls. Uses credentials: 'include' so server session cookie is sent.
// Avoid referencing `process` directly in the browser. Prefer (in order):
// 1) injected env via process.env (when available), 2) a window global `__POLIGON_API_BASE__`, 3) empty string (same-origin)
// Resolve API base in a safe, dev-friendly way (priority):
// 1) build-time env (process.env.REACT_APP_API_BASE) for CRA-style apps
// 2) Vite build-time env (import.meta.env.VITE_API_BASE)
// 3) runtime override: window.__POLIGON_API_BASE__
// 4) if running on localhost prefer relative '' so dev-server proxy will forward /api
const _envBase = (typeof process !== 'undefined' && (process as any)?.env?.REACT_APP_API_BASE) || '';
// Vite exposes import.meta.env — read safely
let _viteBase = ''
try {
  // Vite exposes import.meta.env — use it if available at build/runtime
  // @ts-ignore
  _viteBase = (import.meta as any)?.env?.VITE_API_BASE || ''
} catch (e) {
  _viteBase = ''
}
const _winBase = (typeof window !== 'undefined' && (window as any).__POLIGON_API_BASE__) || '';
let API_BASE: string = '';
if (_envBase) API_BASE = _envBase;
else if (_viteBase) API_BASE = _viteBase;
else if (_winBase) API_BASE = _winBase;
else if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
  // prefer relative paths in local dev so dev-server proxy handles forwarding
  API_BASE = '';
} else {
  API_BASE = '';
}

// Helpful runtime debug logging when diagnosing network/CORS issues.
try {
  // eslint-disable-next-line no-console
  console.debug('[api] API_BASE =', API_BASE || '(relative /api)', { env: _envBase, win: _winBase, location: typeof window !== 'undefined' ? window.location.href : undefined });
} catch (e) {
  /* ignore logging errors */
}

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
    const err: any = new Error(message)
    err.status = res.status
    err.body = data
    try {
      if ((window as any).__pushNotification) {
        ;(window as any).__pushNotification(String(message), undefined, true)
      }
    } catch (e) {}
    throw err
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
    const err: any = new Error(message)
    err.status = res.status
    err.body = data
    try {
      if ((window as any).__pushNotification) {
        ;(window as any).__pushNotification(String(message), undefined, true)
      }
    } catch (e) {}
    throw err
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
