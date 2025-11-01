import { formatISO } from 'date-fns';

const base = '/api/utility/tasks';

async function handleRes(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = body && body.error ? body.error : res.statusText || 'Request failed';
    // Do not auto-notify here to avoid duplicate notifications in callers.
    // Callers should surface errors via the app notification provider as needed.
    throw new Error(String(err));
  }
  return res.json().catch(() => ({}));
}

export async function getTasksForUser() {
  const res = await fetch(`${base}/user/`, { credentials: 'include' });
  return handleRes(res);
}

export async function getTasksForDocument(documentId: number) {
  const res = await fetch(`${base}/document/${documentId}`, { credentials: 'include' });
  return handleRes(res);
}

export async function addTask(payload: {
  assigned_to?: number | null;
  document_id?: number | null;
  task_title: string;
  task_description?: string;
  task_status: 'open' | 'closed';
  from: string; // ISO
  due?: string | null; // ISO or null
}) {
  const body = {
    ...payload,
    from: payload.from,
    due: payload.due ?? null
  };
  const res = await fetch(`${base}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await handleRes(res);
  return data;
}

export async function updateTask(task_id: number, updates: any) {
  // Accepts from/due as ISO strings or null
  const res = await fetch(`${base}/${task_id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const data = await handleRes(res);
  return data;
}

export async function deleteTask(task_id: number) {
  const res = await fetch(`${base}/${task_id}`, { method: 'DELETE', credentials: 'include' });
  const data = await handleRes(res);
  return data;
}

// --- User helper APIs (centralize user-related fetches used by tasks UI)
/**
 * Fetch reduced user list (id, first_name, last_name, email, role)
 */
export async function getReducedUsers() {
  const res = await fetch('/api/users/reduced', { credentials: 'include' });
  return handleRes(res);
}

/**
 * Fetch a single user by id using the check endpoint (enforces permissions)
 */
export async function getUserById(userId: number) {
  const res = await fetch(`/api/users/check/${userId}`, { credentials: 'include' });
  return handleRes(res);
}

export default { getTasksForUser, getTasksForDocument, addTask, updateTask, deleteTask };
