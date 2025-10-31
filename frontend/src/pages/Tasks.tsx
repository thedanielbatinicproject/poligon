import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { parseISO, format, parse, startOfWeek, getDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import './tasks.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import * as TasksApi from '../lib/tasksApi';
import { useSession } from '../lib/session';

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
  const [newFrom, setNewFrom] = useState(''); // datetime-local value
  const [newDue, setNewDue] = useState('');

  // Ensure datetime-local inputs default to noon if user picks a date-only value
  const normalizeInputValue = (val: string) => {
    if (!val) return '';
    // If browser returns date-only like YYYY-MM-DD, append T12:00
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val + 'T12:00';
    // If it's already datetime-local (YYYY-MM-DDTHH:MM) return as-is
    return val;
  };

  const createTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle || !newFrom) return alert('Title and From (start) are required');
    try {
      // Normalize date inputs: if user provided only a date (YYYY-MM-DD) without time,
      // default the time to noon (12:00) so tasks are created with a sensible midday time.
      const normalize = (val: string) => {
        if (!val) return null;
        // Common input formats: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (datetime-local)
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          return new Date(val + 'T12:00:00');
        }
        // Some browsers may include seconds or timezone; Date constructor will handle it.
        return new Date(val);
      };

      const fromDate = normalize(newFrom);
      const dueDate = normalize(newDue as string);

      const payload: any = {
        task_title: newTitle,
        task_description: newDescription,
        task_status: 'open',
        from: fromDate ? fromDate.toISOString() : null,
        due: dueDate ? dueDate.toISOString() : null,
        assigned_to: null,
        document_id: docId ?? null
      };
      await TasksApi.addTask(payload);
      // reset
      setNewTitle(''); setNewDescription(''); setNewFrom(''); setNewDue('');
      await load();
      alert('Task created');
    } catch (err) {
      console.error(err);
      alert('Failed to create task: ' + String(err));
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      if (docId) {
        const res = await TasksApi.getTasksForDocument(docId);
        data = Array.isArray(res) ? res : (res.tasks || []);
      } else {
        const res = await TasksApi.getTasksForUser();
        data = Array.isArray(res) ? res : (res.tasks || []);
      }
      setTasks(data);
    } catch (err) {
      console.error('Failed loading tasks', err);
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [docId]);

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
      <form onSubmit={createTask} className="task-create-form" style={{ marginBottom: 12 }}>
        <input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
        <input placeholder="Description" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
        <label>From</label>
  <input type="datetime-local" value={newFrom} onChange={e => setNewFrom(normalizeInputValue(e.target.value))} required />
        <label>Due (optional)</label>
  <input type="datetime-local" value={newDue} onChange={e => setNewDue(normalizeInputValue(e.target.value))} />
        <button type="submit" className="btn btn-primary">Create</button>
      </form>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Document:</label>
        <select value={docId ?? ''} onChange={e => setDocId(e.target.value ? Number(e.target.value) : null)}>
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
            alert(`Task: ${t.task_title}\nAssigned to: ${t.assigned_to || '—'}\nFrom: ${from}\nDue: ${due}`);
          }}
        />
      </div>

      <hr />
      <h3>List</h3>
      {loading ? <p>Loading...</p> : (
        <div>
          {tasks.length === 0 && <p>No tasks to show.</p>}
          {tasks.map((t: TaskItem) => (
            <div key={t.task_id} className="task-row" style={{ padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{t.task_title}</strong>
                <div style={{ fontSize: 12 }}>{t.task_description}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>From: {t.task_from ? new Date(t.task_from).toLocaleString() : '—'} — Due: {t.task_due ? new Date(t.task_due).toLocaleString() : '—'}</div>
              </div>
              <div>
                {session.user && (session.user.role === 'admin' || session.user.role === 'mentor' || session.user.user_id === t.created_by) && (
                  <button className="btn btn-ghost" onClick={async () => {
                    const ok = confirm('Delete task?');
                    if (!ok) return;
                    try {
                      await TasksApi.deleteTask(t.task_id);
                      await load();
                    } catch (err) { alert('Delete failed: ' + String(err)); }
                  }}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
