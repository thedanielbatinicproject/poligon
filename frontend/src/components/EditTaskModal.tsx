import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import UserFinder from './UserFinder'
import * as TasksApi from '../lib/tasksApi'

export default function EditTaskModal({ open, task, onClose, onSave }: { open: boolean, task: any, onClose: () => void, onSave: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [assignedTo, setAssignedTo] = useState<number | null>(null)
  const [assignedLabel, setAssignedLabel] = useState('')
  const [userFinderOpen, setUserFinderOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!task) return
    setTitle(task.task_title || '')
    setDescription(task.task_description || '')
    if (task.task_from) {
      const d = new Date(task.task_from)
      setFromDate(d.toISOString().slice(0,10))
      setFromTime(d.toTimeString().slice(0,5))
    } else { setFromDate(''); setFromTime('') }
    if (task.task_due) {
      const d = new Date(task.task_due)
      setDueDate(d.toISOString().slice(0,10))
      setDueTime(d.toTimeString().slice(0,5))
    } else { setDueDate(''); setDueTime('') }
  setAssignedTo(task.assigned_to ?? null);
    // Resolve assigned user's display name via users endpoint to prefer first+last name
    (async () => {
      try {
        const res = await fetch('/api/users/reduced', { credentials: 'include' })
        const list = await res.json()
        if (Array.isArray(list) && task.assigned_to) {
          const extractId = (u: any) => (u && (u.user_id ?? u.id ?? u.userId ?? u.id_user)) || null;
          const extractName = (u: any) => `${(u.first_name ?? u.firstName ?? u.given_name ?? '')} ${(u.last_name ?? u.lastName ?? u.family_name ?? '')}`.trim() || (u.email ?? u.email_address ?? '') || String(extractId(u) || '');
          const found = list.find((u: any) => Number(extractId(u)) === Number(task.assigned_to))
          if (found) {
            setAssignedLabel(extractName(found))
            return
          }
        }
      } catch (e) {}
      setAssignedLabel(task.assigned_to_name || (task.assigned_to ? String(task.assigned_to) : ''))
    })()
  }, [task])

  if (!open) return null

  const notify = (msg: string, isErr = false) => {
    try { if ((window as any).__pushNotification) { (window as any).__pushNotification(String(msg), undefined, !!isErr); return } } catch (e) {}
    alert(msg)
  }

  const compose = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return null
    const time = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '12:00'
    return new Date(dateStr + 'T' + time + ':00').toISOString()
  }

  const handleSave = async () => {
    if (!task) return
    setSaving(true)
    try {
      const payload: any = {
        task_title: title,
        task_description: description,
        from: compose(fromDate, fromTime),
        due: compose(dueDate, dueTime),
        assigned_to: assignedTo ?? null
      }
      await TasksApi.updateTask(task.task_id, payload)
      notify('Saved', false)
      onSave()
    } catch (err) {
      console.error('Edit save failed', err)
      notify('Save failed: ' + String(err), true)
    }
    setSaving(false)
  }

  return createPortal(
    <div className="edit-modal-backdrop" role="dialog" aria-modal>
      <div className="edit-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Edit task</h3>
          <button className="uf-close" onClick={onClose}>×</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="form-row">
            <label className="auth-label">Title</label>
            <input className="auth-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="auth-label">Description</label>
            <textarea className="auth-input" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-row" style={{ flex: 1 }}>
              <label className="auth-label">From date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="auth-input" />
            </div>
            <div className="form-row" style={{ flex: 1 }}>
              <label className="auth-label">From time</label>
              <input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className="auth-input" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div className="form-row" style={{ flex: 1 }}>
              <label className="auth-label">Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="auth-input" />
            </div>
            <div className="form-row" style={{ flex: 1 }}>
              <label className="auth-label">Due time</label>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="auth-input" />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 8 }}>
            <label className="auth-label">Assigned to</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="auth-input" value={assignedLabel} disabled />
              <button type="button" className="btn" onClick={() => setUserFinderOpen(true)}>Change</button>
            </div>
          </div>

          <div className="actions">
            <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>Save</button>
          </div>
        </div>

        <UserFinder open={userFinderOpen} onClose={() => setUserFinderOpen(false)} onSelect={(uid) => {
          setAssignedTo(uid)
          // fetch label robustly
          fetch('/api/users/reduced', { credentials: 'include' }).then(r => r.json()).then((list: any[]) => {
            if (!Array.isArray(list)) return
            const extractId = (u: any) => (u && (u.user_id ?? u.id ?? u.userId ?? u.id_user)) || null;
            const extractName = (u: any) => `${(u.first_name ?? u.firstName ?? u.given_name ?? '')} ${(u.last_name ?? u.lastName ?? u.family_name ?? '')}`.trim() || (u.email ?? u.email_address ?? '') || String(extractId(u) || '');
            const found = list.find(u => Number(extractId(u)) === Number(uid))
            if (found) setAssignedLabel(extractName(found))
          }).catch(() => {})
          setUserFinderOpen(false)
        }} />
      </div>
    </div>, document.body
  )
}
