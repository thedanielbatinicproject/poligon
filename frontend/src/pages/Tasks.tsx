import React, { useEffect, useMemo, useState } from 'react';
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
          const res = await fetch('/api/users/reduced', { credentials: 'include' });
          if (res.ok) {
            const list = await res.json();
            const map: Record<number,string> = { ...usersMap };
            if (Array.isArray(list)) {
              const extractId = (u: any) => (u && (u.user_id ?? u.id ?? u.userId ?? u.id_user)) || null;
              const extractName = (u: any) => `${(u.first_name ?? u.firstName ?? u.given_name ?? '')} ${(u.last_name ?? u.lastName ?? u.family_name ?? '')}`.trim() || (u.email ?? u.email_address ?? '') || String(extractId(u) || '');
              for (const u of list) {
                const id = Number(extractId(u) || 0);
                if (id) map[id] = extractName(u);
              }
              setUsersMap(map);
            }
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
    fetch('/api/users/reduced', { credentials: 'include' })
      .then(r => r.json())
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

  // helper to resolve a user label by id (calls reduced list)
  const loadUserLabel = async (userId: number | null) => {
    if (!userId) return setAssignedToLabel('');
    try {
      const res = await fetch('/api/users/reduced', { credentials: 'include' });
      if (!res.ok) return;
      const list = await res.json();
      const found = Array.isArray(list) ? list.find((x: any) => Number(x.user_id) === Number(userId)) : null;
      if (found) setAssignedToLabel(`${found.first_name || ''} ${found.last_name || ''}`.trim() || found.email || String(found.user_id));
    } catch (e) {}
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

  const events = useMemo(() => tasks.map((t: TaskItem) => {
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
      title: t.task_title + (t.assigned_to ? ` (${t.assigned_to})` : ''),
      start,
      end,
      allDay,
      extendedProps: t
    } as Event;
  }), [tasks]);

  return (
    <div style={{ padding: 12 }}>
      <h2>Tasks</h2>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Document:</label>
        <select value={docId ?? ''} onChange={e => {
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
            try {
              if ((window as any).__pushNotification) {
                ;(window as any).__pushNotification(`Task: ${t.task_title} — Assigned to: ${t.assigned_to || '—'} — From: ${from} — Due: ${due}`)
                return
              }
            } catch (e) {}
            alert(`Task: ${t.task_title}\nAssigned to: ${t.assigned_to || '—'}\nFrom: ${from}\nDue: ${due}`);
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
            <label className="auth-label">Document</label>
            <select value={docId ?? ''} onChange={e => {
              const v = e.target.value ? Number(e.target.value) : null
              setDocId(v)
              try { if (session && typeof session.patchSession === 'function') session.patchSession({ last_document_id: v }).catch(() => {}) } catch (e) {}
            }} className="auth-input">
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
            <button type="button" className="btn" onClick={() => { setNewTitle(''); setNewDescription(''); setNewFromDate(''); setNewFromTime(''); setNewDueDate(''); setNewDueTime(''); }}>Reset</button>
            <button type="submit" className="btn btn-primary">Create</button>
          </div>
        </form>
      </div>

  <hr />
  <h3>{(docId !== null) ? `All tasks for document with id "${docId ?? 'Global'}"` : 'Global tasks'}</h3>
  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Showing {tasks.length} tasks</div>
      {loading ? <p>Loading...</p> : (
        <div>
          {tasks.length === 0 && <p>No tasks to show.</p>}
          {tasks.map((t: TaskItem) => {
            const role = session?.user?.role;
            const uid = session?.user?.user_id;
            const assignedLabel = t.assigned_to ? (usersMap[Number(t.assigned_to)] || String(t.assigned_to)) : '—';
            const creatorLabel = t.created_by ? (usersMap[Number(t.created_by)] || String(t.created_by)) : '—';
            const canEdit = (role === 'admin' || role === 'mentor' || Number(uid) === Number(t.created_by));
            const canToggle = (role === 'admin' || role === 'mentor' || Number(uid) === Number(t.created_by) || Number(uid) === Number(t.assigned_to));
            const canDelete = (role === 'admin' || role === 'mentor' || Number(uid) === Number(t.created_by));
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
                    <button className="btn" onClick={() => openStatusToggle(t)}>{t.task_status === 'open' ? 'Mark closed' : 'Reopen'}</button>
                  )}
                  {canEdit && (
                    <button className="btn" onClick={() => openEditModal(t)}>Edit</button>
                  )}
                  {canDelete && (
                    <button className="btn btn-ghost" onClick={() => { setConfirmTaskId(t.task_id); setConfirmOpen(true); }}>Delete</button>
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

