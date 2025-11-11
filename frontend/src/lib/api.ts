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


// [YjsWS] Yjs websocket is now handled externally (wss://socket.poligon.live), not via API_BASE
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

// Debug logging removed in production build to avoid noisy console output.

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

async function putJSON(path: string, body?: any) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const contentType = res.headers.get('content-type') || ''
  let data: any = null
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }
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

async function deleteJSON(path: string, body?: any) {
  const res = await fetch(API_BASE + path, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const contentType = res.headers.get('content-type') || ''
  let data: any = null
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }
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
  // Admin statistics endpoints
  getTotalRenders: () => getJSON('/api/documents/renders/count'),
  getStorageStats: () => getJSON('/api/utility/storage'),
  getActiveSessionsCount: () => getJSON('/api/utility/sessions/count'),
  getRenderServiceStatus: () => getJSON('/api/utility/render-service/status'),
  // User management endpoints (admin-only)
  getAllUsers: () => getJSON('/api/users'),
  getUserById: (userId: number) => getJSON(`/api/users/check/${userId}`),
  createUser: (userData: any) => postJSON('/api/users', userData),
  updateUser: (userId: number, userData: any) => putJSON(`/api/users/${userId}`, userData),
  deleteUser: (userId: number) => deleteJSON(`/api/users/${userId}`),
  getUserSessions: (userId: number) => getJSON(`/api/users/sessions/${userId}`),
  deleteAllUserSessions: (userId: number) => deleteJSON(`/api/users/sessions/${userId}`),
  bulkUpdateRoles: (payload: { user_ids: number[], new_role: string }) => putJSON('/api/users/bulk-role', payload),
  resendPassword: (userId: number, recipientEmail: string) => postJSON('/api/users/resend-password', { user_id: userId, recipient_email: recipientEmail }),
  checkUserHasLocal: (userId: number) => getJSON(`/api/users/${userId}/has-local`),
  getAllSessions: () => getJSON('/api/utility/sessions/all'),
  deleteSession: (sessionId: string) => deleteJSON(`/api/utility/session/${sessionId}`),
  // Document management endpoints (admin-only)
  getAllDocuments: () => getJSON('/api/documents/all'),
  getDocumentById: (documentId: number) => getJSON(`/api/documents/${documentId}`),
  deleteDocument: (documentId: number) => deleteJSON(`/api/documents/${documentId}`),
  // Document types CRUD
  getAllDocumentTypes: () => getJSON('/api/utility/document-types'),
  createDocumentType: (data: { type_name: string; description: string }) => postJSON('/api/utility/document-types', data),
  updateDocumentType: (typeId: number, data: { type_name: string; description: string }) => putJSON(`/api/utility/document-types/${typeId}`, data),
  deleteDocumentType: (typeId: number) => deleteJSON(`/api/utility/document-types/${typeId}`),
  // Document editors management
  getDocumentEditors: (documentId: number) => getJSON(`/api/documents/${documentId}/editors`),
  addDocumentEditor: (documentId: number, data: { user_id: number; editor_role: string }) => postJSON(`/api/documents/${documentId}/editors`, data),
  removeDocumentEditor: (documentId: number, userId: number) => deleteJSON(`/api/documents/${documentId}/editors`, { user_id: userId }),
  // File management
  getDocumentFiles: (documentId: number) => getJSON(`/api/files/document/${documentId}`),
  uploadImage: (documentId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_id', String(documentId));
    return fetch(API_BASE + '/api/files/upload/image', {
      method: 'POST',
      credentials: 'include',
      body: formData
    }).then(async res => {
      const data = await parseResponse(res);
      if (!res.ok) {
        const err: any = new Error(data.error || 'Upload failed');
        err.status = res.status;
        err.body = data;
        throw err;
      }
      return data;
    });
  },
  uploadDocument: (documentId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_id', String(documentId));
    return fetch(API_BASE + '/api/files/upload/document', {
      method: 'POST',
      credentials: 'include',
      body: formData
    }).then(async res => {
      const data = await parseResponse(res);
      if (!res.ok) {
        const err: any = new Error(data.error || 'Upload failed');
        err.status = res.status;
        err.body = data;
        throw err;
      }
      return data;
    });
  },
  deleteFile: (fileId: number) => deleteJSON(`/api/files/${fileId}`),
  downloadFile: (fileId: number) => `${API_BASE}/api/files/download/${fileId}`,
  // Document versions
  getDocumentVersions: (documentId: number) => getJSON(`/api/documents/${documentId}/versions`),
  downloadVersion: (documentId: number, versionId: number) => `${API_BASE}/api/documents/${documentId}/versions/${versionId}/download`,
};

export default api;

