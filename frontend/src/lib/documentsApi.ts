const base = '/api/documents';

async function handleRes(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = body && body.error ? body.error : res.statusText || 'Request failed';
    throw new Error(String(err));
  }
  return res.json().catch(() => ({}));
}

export async function getAllDocuments() {
  const res = await fetch(`${base}/all`, { credentials: 'include' });
  return handleRes(res);
}

export async function createDocument(payload: any) {
  const res = await fetch(`${base}/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleRes(res);
}

export async function updateDocument(documentId: number, updates: any) {
  const res = await fetch(`${base}/${documentId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleRes(res);
}

export async function deleteDocument(documentId: number) {
  const res = await fetch(`${base}/${documentId}`, { method: 'DELETE', credentials: 'include' });
  return handleRes(res);
}

export async function getDocumentContent(documentId: number) {
  const res = await fetch(`${base}/${documentId}/content`, { credentials: 'include' });
  return handleRes(res);
}

export async function updateDocumentContent(documentId: number, body: any) {
  const res = await fetch(`${base}/${documentId}/content`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return handleRes(res);
}

export async function renderDocument(documentId: number) {
  const res = await fetch(`${base}/${documentId}/render`, {
    method: 'POST',
    credentials: 'include'
  });
  return handleRes(res);
}

export async function getEditors(documentId: number) {
  const res = await fetch(`${base}/${documentId}/editors`, { credentials: 'include' });
  return handleRes(res);
}

export async function getDocumentTypes() {
  const res = await fetch(`/api/utility/document-types`, { credentials: 'include' });
  return handleRes(res);
}

export async function addEditor(documentId: number, payload: { user_id: number; role?: string }) {
  // backend expects field 'editor_role' not 'role'
  const body = { user_id: payload.user_id, editor_role: payload.role || 'editor' };
  const res = await fetch(`${base}/${documentId}/editors`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return handleRes(res);
}

export async function removeEditor(documentId: number, payload: { user_id: number }) {
  const res = await fetch(`${base}/${documentId}/editors`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleRes(res);
}

export async function getVersions(documentId: number) {
  const res = await fetch(`${base}/${documentId}/versions`, { credentials: 'include' });
  return handleRes(res);
}

export default {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentContent,
  updateDocumentContent,
  renderDocument,
  getEditors,
  addEditor,
  removeEditor,
  getVersions
  , getDocumentTypes
};
