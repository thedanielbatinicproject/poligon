import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { parseISO, format, parse, startOfWeek, getDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import './tasks.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import * as TasksApi from '../lib/tasksApi';
import { useSession } from '../lib/session';
import ConfirmationBox from '../components/ConfirmationBox';
import UserFinder from '../components/UserFinder';
import EditTaskModal from '../components/EditTaskModal';

// Use enUS locale consistently to avoid missing `localize` implementation errors
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string) => format(date, formatStr, { locale: enUS }),
  parse: (value: string, formatStr: string) => parse(value, formatStr, new Date(), { locale: enUS }),
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay: (date: Date) => getDay(date),
  locales
});

type TaskItem = any;

export default function Tasks() {
  const session = useSession();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [docId, setDocId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTaskId, setConfirmTaskId] = useState<number | null>(null);
  // status change confirmation
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ id: number; newStatus: 'open' | 'closed' } | null>(null);
  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<any | null>(null);

  // users map for labels
  const [usersMap, setUsersMap] = useState<Record<number,string>>({});
  const pendingUserFetch = useRef<Set<number>>(new Set());

  // Helper: fetch a single user by id (prefer /api/users/check/:id which enforces permissions)
  const fetchUserById = async (userId: number) => {
    if (!userId) return;
    if (pendingUserFetch.current.has(userId)) return;
    pendingUserFetch.current.add(userId);
    try {
      // Try to fetch single user details (may be restricted)
      const u = await TasksApi.getUserById(Number(userId)).catch(() => null);
      if (u) {
        const name = `${u.first_name ?? u.firstName ?? ''} ${u.last_name ?? u.lastName ?? ''}`.trim() || u.email || String(u.user_id || userId);
        setUsersMap(prev => ({ ...prev, [Number(userId)]: name }));
        return;
      }
      // If single-user endpoint is not allowed or returned nothing, fallback to reduced list
      const list = await TasksApi.getReducedUsers().catch(() => null);
      if (Array.isArray(list)) {
        const map: Record<number,string> = {};
        for (const uu of list) {
          const id = Number(uu.user_id ?? uu.id ?? uu.userId ?? 0);
          if (!id) continue;
          const nm = `${uu.first_name ?? uu.firstName ?? ''} ${uu.last_name ?? uu.lastName ?? ''}`.trim() || uu.email || String(id);
          map[id] = nm;
        }
        setUsersMap(prev => ({ ...prev, ...map }));
        // if reduced list didn't include our id, set a placeholder
        if (!map[Number(userId)]) {
          setUsersMap(prev => ({ ...prev, [Number(userId)]: String(userId) }));
        }
      } else {
        // ultimate fallback
        setUsersMap(prev => ({ ...prev, [Number(userId)]: String(userId) }));
      }
    } catch (e) {
      // network or parse error -> fallback
      setUsersMap(prev => ({ ...prev, [Number(userId)]: String(userId) }));
    } finally {
      pendingUserFetch.current.delete(userId);
    }
  };

  useEffect(() => {
    // load user documents for selector
    fetch('/api/documents/all', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDocuments(Array.isArray(d) ? d : []))
      .catch(() => setDocuments([]));
  }, []);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  // assigned_to state
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [assignedToLabel, setAssignedToLabel] = useState<string>('');
  const [userFinderOpen, setUserFinderOpen] = useState(false);
  // Separate date and optional time inputs to avoid browser datetime-local validation
  const [newFromDate, setNewFromDate] = useState(''); // YYYY-MM-DD
  const [newFromTime, setNewFromTime] = useState(''); // HH:MM optional
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');

  // Notification helper: prefer the app's notification system, fallback to alert
  const notify = (msg: string, isError = false) => {
    try {
      if ((window as any).__pushNotification) {
        ;(window as any).__pushNotification(String(msg), undefined, !!isError)
        return
      }
    } catch (e) {}
    // fallback
    alert(String(msg))
  }

  const createTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle || !newFromDate) return notify('Title and From (start) are required', true);
    try {
      // Compose ISO datetimes from date + optional time. Default time is 12:00 if not provided.
      const compose = (dateStr: string, timeStr?: string) => {
        if (!dateStr) return null;
        const time = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '12:00';
        return new Date(dateStr + 'T' + time + ':00');
      };

      const fromDate = compose(newFromDate, newFromTime);
      const dueDate = compose(newDueDate, newDueTime);

      const payload: any = {
        task_title: newTitle,
        task_description: newDescription,
        task_status: 'open',
        from: fromDate ? fromDate.toISOString() : null,
        due: dueDate ? dueDate.toISOString() : null,
        assigned_to: null,
        document_id: docId ?? null
      };
      // include assigned_to if present
      if (assignedTo) payload.assigned_to = assignedTo;
      await TasksApi.addTask(payload);
      // reset
      setNewTitle(''); setNewDescription(''); setNewFromDate(''); setNewFromTime(''); setNewDueDate(''); setNewDueTime('');
      await load();
      notify('Task created', false);
    } catch (err) {
      console.error(err);
      notify('Failed to create task: ' + String(err), true);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      // Treat selected document explicitly: when docId is NOT null we request
      // document-scoped tasks. Using a truthy check caused document id 0 to be
      // treated as "no document" and fall back to global tasks.
      if (docId !== null) {
        const res = await TasksApi.getTasksForDocument(docId as number);
        data = Array.isArray(res) ? res : (res.tasks || []);
      } else {
        const res = await TasksApi.getTasksForUser();
        data = Array.isArray(res) ? res : (res.tasks || []);
      }
      // Ensure we have labels for any assigned_to or created_by referenced in tasks
      try {
        const needed: number[] = [];
        for (const t of data) {
          if (t.assigned_to && !usersMap[Number(t.assigned_to)]) needed.push(Number(t.assigned_to));
          if (t.created_by && !usersMap[Number(t.created_by)]) needed.push(Number(t.created_by));
        }
        if (needed.length > 0) {
          // Try to fetch reduced list once to bulk-populate (centralized in tasksApi)
          const list = await TasksApi.getReducedUsers().catch(() => null);
          if (Array.isArray(list)) {
            const map: Record<number,string> = { ...usersMap };
            const extractId = (u: any) => (u && (u.user_id ?? u.id ?? u.userId ?? u.id_user)) || null;
            const extractName = (u: any) => `${(u.first_name ?? u.firstName ?? u.given_name ?? '')} ${(u.last_name ?? u.lastName ?? u.family_name ?? '')}`.trim() || (u.email ?? u.email_address ?? '') || String(extractId(u) || '');
            for (const u of list) {
              const id = Number(extractId(u) || 0);
              if (id) map[id] = extractName(u);
            }
            setUsersMap(map);
          }
          // For any still-missing ids, queue individual fetches
          for (const id of needed) {
            if (!usersMap[Number(id)]) fetchUserById(Number(id)).catch(() => {});
          }
        }
      } catch (e) {
        // ignore fetch errors - we'll fallback to id display
      }

      setTasks(data);
    } catch (err) {
      console.error('Failed loading tasks', err);
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [docId]);

  // initialize assignedTo to current user when session available
  useEffect(() => {
    try {
      if (session && session.user) {
        const u = session.user;
        setAssignedTo(u.user_id ?? null);
        setAssignedToLabel(u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.email || String(u.user_id || '')));
      }
    } catch (e) {}
  }, [session.user]);

  // load reduced user list for labels
  useEffect(() => {
    const extractId = (u: any) => (u && (u.user_id ?? u.id ?? u.userId ?? u.id_user)) || null;
    const extractName = (u: any) => {
      if (!u) return '';
      return `${(u.first_name ?? u.firstName ?? u.given_name ?? '')} ${(u.last_name ?? u.lastName ?? u.family_name ?? '')}`.trim() || (u.email ?? u.email_address ?? '') || String(extractId(u) || '');
    };
    TasksApi.getReducedUsers()
      .then((list: any[]) => {
        const map: Record<number,string> = {};
        if (Array.isArray(list)) {
          for (const u of list) {
            const id = Number(extractId(u) || 0);
            if (id) map[id] = extractName(u);
          }
        }
        setUsersMap(map);
      })
      .catch(() => {});
  }, []);

  // helper to resolve a user label by id (calls reduced list or single-user endpoint)
  const loadUserLabel = async (userId: number | null) => {
    if (!userId) return setAssignedToLabel('');
    // preferred: use existing map
    const cached = usersMap[Number(userId)];
    if (cached) { setAssignedToLabel(cached); return; }
    // otherwise try fetching single user
    try {
      await fetchUserById(Number(userId));
      const v = usersMap[Number(userId)];
      if (v) setAssignedToLabel(v);
      else setAssignedToLabel(String(userId));
    } catch (e) {
      setAssignedToLabel(String(userId));
    }
  };

  // Auto-select document from session.last_document_id when first arriving on the page
  useEffect(() => {
    try {
      // support variants: last_document_id or last_document
      if (!session || !session.session) return
      const hasKey = Object.prototype.hasOwnProperty.call(session.session, 'last_document_id') || Object.prototype.hasOwnProperty.call(session.session, 'last_document')
      if (!hasKey) return
      const raw = ('last_document_id' in (session.session || {})) ? session.session.last_document_id : session.session.last_document
      if (raw === null) {
        // explicitly global
        setDocId(null)
        return
      }
      const n = Number(raw)
      if (!isNaN(n)) setDocId(n)
    } catch (e) {}
  }, [session.loading, session.session]);

  const handleConfirmDelete = async () => {
    const id = confirmTaskId;
    setConfirmOpen(false);
    setConfirmTaskId(null);
    if (!id) return;
    try {
      await TasksApi.deleteTask(id);
      notify('Task deleted', false);
      await load();
    } catch (err) {
      console.error('Delete task failed', err);
      notify('Delete failed: ' + String(err), true);
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTaskId(null);
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget) { setStatusConfirmOpen(false); return }
    const { id, newStatus } = statusTarget;
    setStatusConfirmOpen(false);
    setStatusTarget(null);
    try {
      await TasksApi.updateTask(id, { task_status: newStatus });
      notify('Task status updated', false);
      await load();
    } catch (err) {
      console.error('Status update failed', err);
      notify('Status update failed: ' + String(err), true);
    }
  };

  const openStatusToggle = (task: any) => {
    const newStatus = task.task_status === 'open' ? 'closed' : 'open';
    setStatusTarget({ id: task.task_id, newStatus });
    setStatusConfirmOpen(true);
  };

  const openEditModal = (task: any) => {
    setEditTask(task);
    setEditOpen(true);
  };

  const handleEditSaved = async () => {
    setEditOpen(false);
    setEditTask(null);
    await load();
    notify('Task saved', false);
  };

  // Build calendar events, excluding tasks that are closed so they don't appear on the calendar
  const events = useMemo(() =>
    tasks
      .filter(t => String(t.task_status ?? '').toLowerCase() !== 'closed')
      .map((t: TaskItem) => {
        const start = t.task_from ? new Date(t.task_from) : new Date(t.created_at);
        let end: Date;
        let allDay = true;
        if (t.task_due) {
          end = new Date(t.task_due);
          // For full-day rendering, set end to endOfDay
          end = endOfDay(end);
          allDay = true;
        } else {
          end = endOfDay(start);
        }
        return {
          id: t.task_id,
          title: t.task_title + (t.assigned_to ? ` (${usersMap[Number(t.assigned_to)] || t.assigned_to})` : ''),
          start,
          end,
          allDay,
          extendedProps: t
        } as Event;
      }),
    [tasks, usersMap]
  );
  

  // choose singular/plural for the tasks count label
  const tasksCountLabel = tasks.length === 1 ? 'task' : 'tasks';

  return (
    <div style={{ padding: 12 }}>
      <h2>Tasks</h2>
      { /* compute proper singular/plural label for tasks count */ }
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      {null}
      
      <div className="task-top-controls" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Select document:</label>
        <select className="auth-input doc-select" value={docId ?? ''} onChange={e => {
          const v = e.target.value ? Number(e.target.value) : null
          setDocId(v)
          try {
            if (session && typeof session.patchSession === 'function') {
              // fire-and-forget
              session.patchSession({ last_document_id: v }).catch(() => {})
            }
          } catch (e) {}
        }}>
          <option value="">(All / Global)</option>
          {documents.map(d => <option key={d.document_id} value={d.document_id}>{d.title}</option>)}
        </select>
        <button className="btn" onClick={() => load()} disabled={loading}>Refresh</button>
      </div>

      <div style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={(ev: any) => {
            const t = ev.extendedProps as TaskItem;
            // Friendly date formatting
            const from = t.task_from ? new Date(t.task_from).toLocaleString() : '-';
            const due = t.task_due ? new Date(t.task_due).toLocaleString() : '-';
            const assignedLabelLocal = t.assigned_to ? (usersMap[Number(t.assigned_to)] || String(t.assigned_to)) : '—';
            try {
              if ((window as any).__pushNotification) {
                ;(window as any).__pushNotification(`Task: ${t.task_title} — Assigned to: ${assignedLabelLocal} — From: ${from} — Due: ${due}`)
                return
              }
            } catch (e) {}
            alert(`Task: ${t.task_title}\nAssigned to: ${assignedLabelLocal}\nFrom: ${from}\nDue: ${due}`);
          }}
        />
      </div>

      {/* Task create card - moved below calendar */}
      <div style={{ marginTop: 16 }} className="glass-panel profile-card task-create-card">
        <h3 style={{ marginTop: 0, color: 'var(--heading-2)' }}>Create new task</h3>
        <form onSubmit={createTask} className="task-create-form-centered">
          <div className="form-row">
            <label className="auth-label">Title</label>
            <input className="auth-input" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          </div>

          <div className="form-row">
            <label className="auth-label" style={{ fontSize: 16 }}>Description</label>
            <textarea className="auth-input" value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={4} />
          </div>

          <div className="two-cols">
            <div className="form-row">
              <label className="auth-label">From date</label>
              <input type="date" value={newFromDate} onChange={e => setNewFromDate(e.target.value)} className="auth-input" />
            </div>
            <div className="form-row">
              <label className="auth-label">From time (optional)</label>
              <input type="time" value={newFromTime} onChange={e => setNewFromTime(e.target.value)} className="auth-input" />
            </div>
          </div>

          <div className="two-cols">
            <div className="form-row">
              <label className="auth-label">Due date (optional)</label>
              <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="auth-input" />
            </div>
            <div className="form-row">
              <label className="auth-label">Due time (optional)</label>
              <input type="time" value={newDueTime} onChange={e => setNewDueTime(e.target.value)} className="auth-input" />
            </div>
          </div>

          <div className="form-row">
            <label className="auth-label">Select document:</label>
            <select value={docId ?? ''} onChange={e => {
              const v = e.target.value ? Number(e.target.value) : null
              setDocId(v)
              try { if (session && typeof session.patchSession === 'function') session.patchSession({ last_document_id: v }).catch(() => {}) } catch (e) {}
            }} className="auth-input doc-select">
              <option value="">(All / Global)</option>
              {documents.map(d => <option key={d.document_id} value={d.document_id}>{d.title}</option>)}
            </select>
          </div>

          <div className="form-row">
            <label className="auth-label">Assigned to</label>
            {/* Admins/mentors can open UserFinder to pick a user; regular users see their own name (read-only) */}
            {(session.user && (session.user.role === 'admin' || session.user.role === 'mentor')) ? (
              <button
                type="button"
                className="auth-input assigned-picker"
                aria-haspopup="dialog"
                title="Click to choose a user"
                onClick={() => setUserFinderOpen(true)}
              >{(assignedToLabel && `${assignedToLabel} ▾`) || 'Click to select user ▾'}</button>
            ) : (
              <input className="auth-input assigned-picker" value={assignedToLabel} disabled aria-disabled="true" />
            )}
          </div>

          <div className="form-row actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setNewTitle(''); setNewDescription(''); setNewFromDate(''); setNewFromTime(''); setNewDueDate(''); setNewDueTime(''); }}>Reset</button>
            <button type="submit" className="btn btn-primary">Create</button>
          </div>
        </form>
      </div>

  <hr />
  <h3 style={{ textAlign: 'center' }}>{(docId !== null) ? `All tasks for document with id "${docId ?? 'Global'}"` : 'Global tasks'}</h3>
  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textAlign: 'center' }}>Showing {tasks.length} {tasksCountLabel}</div>
      {loading ? <p>Loading...</p> : (
        <div>
          {tasks.length === 0 && <p>No tasks to show.</p>}
          {tasks.map((t: TaskItem) => {
            const role = session?.user?.role;
            // normalize different possible id shapes to numbers for robust comparison
            const normalizeId = (v: any): number | null => {
              if (v === null || v === undefined) return null;
              if (typeof v === 'number') return Number(v);
              if (typeof v === 'string' && v.trim() !== '') return Number(v);
              if (typeof v === 'object') return Number(v.user_id ?? v.id ?? v.userId ?? v.id_user ?? NaN);
              return null;
            };
            const uid = normalizeId(session?.user?.user_id ?? session?.user?.id ?? session?.user?.userId);
            const assignedToId = normalizeId(t.assigned_to);
            const createdById = normalizeId(t.created_by);
            const assignedLabel = assignedToId ? (usersMap[Number(assignedToId)] || String(assignedToId)) : '—';
            const creatorLabel = createdById ? (usersMap[Number(createdById)] || String(createdById)) : '—';
            const isAdminOrMentor = role === 'admin' || role === 'mentor';
            const canEdit = (isAdminOrMentor || (uid !== null && createdById !== null && Number(uid) === Number(createdById)));
            const canToggle = (isAdminOrMentor || (uid !== null && ((createdById !== null && Number(uid) === Number(createdById)) || (assignedToId !== null && Number(uid) === Number(assignedToId)))));
            const canDelete = (isAdminOrMentor || (uid !== null && createdById !== null && Number(uid) === Number(createdById)));
            return (
              <div key={t.task_id} className={`task-row ${t.task_status === 'closed' ? 'closed' : ''}`}>
                <div className="task-main">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong className="task-title">{t.task_title}</strong>
                      <span className={`task-tag ${t.task_status === 'open' ? 'task-tag-open' : 'task-tag-closed'}`}>{(t.task_status || 'open').toUpperCase()}</span>
                    </div>
                    <div className="task-desc" style={{ marginTop: 6 }}>{t.task_description}</div>
                    <div className="task-meta">From: {t.task_from ? new Date(t.task_from).toLocaleString() : '—'} • Due: {t.task_due ? new Date(t.task_due).toLocaleString() : '—'}</div>
                    <div className="task-meta">Created by: {creatorLabel} • Assigned to: {assignedLabel} • Status: {t.task_status} • Created at: {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</div>
                  </div>
                </div>
                <div className="task-actions">
                  {canToggle && (
                    <button className="btn btn-action" onClick={() => openStatusToggle(t)}>{t.task_status === 'open' ? 'Mark closed' : 'Reopen'}</button>
                  )}
                  {canEdit && (
                    <button className="btn btn-action" onClick={() => openEditModal(t)}>Edit</button>
                  )}
                  {canDelete && (
                    <button className="btn btn-danger" onClick={() => { setConfirmTaskId(t.task_id); setConfirmOpen(true); }}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmationBox
        title="Delete task"
        question="Are you sure you want to delete this task? This action cannot be undone."
        isOpen={confirmOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      <ConfirmationBox
        title={statusTarget && statusTarget.newStatus === 'closed' ? 'Close task' : 'Reopen task'}
        question={statusTarget && statusTarget.newStatus === 'closed' ? 'Are you sure you want to mark this task as closed?' : 'Are you sure you want to reopen this task?'}
        isOpen={statusConfirmOpen}
        onConfirm={handleStatusConfirm}
        onCancel={() => { setStatusConfirmOpen(false); setStatusTarget(null); }}
      />
      <EditTaskModal open={editOpen} task={editTask} onClose={() => setEditOpen(false)} onSave={handleEditSaved} />
      <UserFinder open={userFinderOpen} onClose={() => setUserFinderOpen(false)} onSelect={(uid) => {
        setAssignedTo(uid);
        loadUserLabel(uid).catch(() => {});
      }} />
    </div>
  );
}

