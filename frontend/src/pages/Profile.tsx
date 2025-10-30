import React, { useEffect, useMemo, useState } from 'react'
import { useSession } from '../lib/session'
import { getJSON, postJSON, apiFetch } from '../lib/api'
import { useNotifications } from '../lib/notifications'
import ConfirmationBox from '../components/ConfirmationBox'

function fmtZagreb(d: string | Date | null) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  try {
    const pad = (n: number) => String(n).padStart(2, '0')
    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1)
    const year = date.getFullYear()
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    return `${day}.${month}.${year}@${hh}:${mm}:${ss}`
  } catch (e) {
    return date.toString()
  }
}

export default function Profile(): JSX.Element {
  const { user, session, refresh, logout } = useSession()
  const notifier = useNotifications()

  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [editable, setEditable] = useState<Record<string, any>>({})
  const [dirty, setDirty] = useState<Record<string, boolean>>({})

  // sessions
  const [activeSessionIds, setActiveSessionIds] = useState<string[]>([])
  const [sessionRows, setSessionRows] = useState<Record<string, any>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // fetch /api/auth/status to get user + active_sessions
        const st: any = await getJSON('/api/auth/status')
        setUserData(st)
        const ids = Array.isArray(st.active_sessions) ? st.active_sessions : []
        setActiveSessionIds(ids)

        // fetch details for each session id
        const fetched: Record<string, any> = {}
        await Promise.all(ids.map(async (id: string) => {
          try {
            const s = await getJSON(`/api/utility/session/${encodeURIComponent(id)}`)
            fetched[id] = s
          } catch (e) {
            // ignore per-session failures but notify
            console.warn('Failed to fetch session details for', id, e)
          }
        }))
        setSessionRows(fetched)
      } catch (err: any) {
        notifier.push(String(err?.message || err), undefined, true)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) {
      setEditable({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        preferred_language: user.preferred_language || '',
        principal_name: user.principal_name || user.email || '',
        display_name: (user.first_name || '') + ' ' + (user.last_name || ''),
      })
    }
  }, [user])

  async function saveField(field: string) {
    if (!user) return
    const payload: any = {}
    payload[field] = editable[field]
    try {
      await apiFetch(`/api/users/${user.user_id}`, { method: 'PUT', body: JSON.stringify(payload) })
      notifier.push(`Field ${field} successfully saved on database!`, 3)
      setDirty((d) => ({ ...d, [field]: false }))
      // refresh session/user info
      await refresh()
    } catch (err: any) {
      notifier.push(String(err?.message || err), undefined, true)
    }
  }

  function onChangeField(field: string, value: any) {
    setEditable((s) => ({ ...s, [field]: value }))
    setDirty((d) => ({ ...d, [field]: true }))
  }

  // Determine current session id from the session cookie (express-session default cookie name: connect.sid)
  const getSessionIdFromCookie = () => {
    try {
      const m = document.cookie.match(new RegExp('(^| )' + 'connect.sid' + '=([^;]+)'))
      if (!m) return null
      let v = decodeURIComponent(m[2] || '')
      // cookie format when signed: s:<sessionId>.<signature>
      if (v.startsWith('s:')) v = v.slice(2)
      // if signature appended, split on '.' and take first segment
      if (v.includes('.')) v = v.split('.')[0]
      return v || null
    } catch (e) {
      return null
    }
  }

  const currentSessionId = useMemo(() => getSessionIdFromCookie(), [])

  function openConfirmFor(sessionId: string) {
    setSelectedSessionId(sessionId)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!selectedSessionId) return
    try {
      await fetch(`/api/utility/session/${encodeURIComponent(selectedSessionId)}`, { method: 'DELETE', credentials: 'include' })
      notifier.push('Session deleted', 3)
      // refresh list
      // reload auth/status
      const st: any = await getJSON('/api/auth/status')
      const ids = Array.isArray(st.active_sessions) ? st.active_sessions : []
      setActiveSessionIds(ids)
      // remove from rows
      setSessionRows((r) => {
        const copy = { ...r }
        delete copy[selectedSessionId]
        return copy
      })
      // if we deleted current session, force logout/refresh
      if (selectedSessionId === currentSessionId) {
        try {
          await postJSON('/api/auth/logout', {})
        } catch (_) {}
        // force reload
        window.location.reload()
        return
      }
    } catch (err: any) {
      notifier.push(String(err?.message || err), undefined, true)
    } finally {
      setConfirmOpen(false)
      setSelectedSessionId(null)
    }
  }

  // Password change state
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  async function changePassword() {
    if (!user) return
    if (!newPass || newPass !== newPass2) {
      notifier.push('Passwords do not match', undefined, true)
      return
    }
    if (newPass.length < 6) {
      notifier.push('Password must be at least 6 characters', undefined, true)
      return
    }
    try {
      setPwLoading(true)
      await postJSON('/api/users/local-change-password', { user_id: user.user_id, new_password: newPass })
      notifier.push('Password changed — you will be logged out now', 3)
      // logout and reload
      try { await postJSON('/api/auth/logout', {}) } catch (e) {}
      window.location.reload()
    } catch (err: any) {
      notifier.push(String(err?.message || err), undefined, true)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <main>
      <h1 style={{ color: 'var(--heading-2)' }}>Profile</h1>

      {/* General info cards */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="glass-panel" style={{ padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>General information</h3>
          {!user && <p>Loading...</p>}
          {user && (
            <div style={{ display: 'grid', gap: 10 }}>
              {['first_name','last_name','preferred_language','principal_name','display_name'].map((f) => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label className="auth-label" style={{ marginBottom: 6 }}>{f.replace('_',' ')}</label>
                    <input className="auth-input" style={{ width: '100%' }} value={editable[f] || ''} onChange={(e) => onChangeField(f, e.target.value)} />
                  </div>
                  <div>
                    {dirty[f] ? (
                      <button className="btn btn-primary" onClick={() => saveField(f)}>Save</button>
                    ) : null}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 10 }}>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Role: <strong>{user.role}</strong> (read-only)</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Email: <strong>{user.email}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Sessions and password column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass-panel" style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Active sessions</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                    <th>session_id</th>
                    <th>last_route</th>
                    <th>user_agent</th>
                    <th>ip_address</th>
                    <th>created_at</th>
                    <th>expires_at</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessionIds.map((sid) => {
                    const row = sessionRows[sid]
                    const isCurrent = sid === currentSessionId
                    return (
                      <tr key={sid} style={{ background: isCurrent ? 'linear-gradient(90deg,var(--success), rgba(var(--success-rgb),0.06))' : 'transparent' }}>
                        <td style={{ padding: '8px 6px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(sid); notifier.push('Copied session id', 2) }}>
                            {sid.slice(0, 10)}…
                          </button>
                        </td>
                        <td style={{ padding: '8px 6px' }}>{row ? row.last_route || '—' : '—'}</td>
                        <td style={{ padding: '8px 6px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row ? row.user_agent : ''}>{row ? (row.user_agent || '—') : '—'}</td>
                        <td style={{ padding: '8px 6px' }}>{row ? (row.ip_address || '') : ''}</td>
                        <td style={{ padding: '8px 6px' }}>{row ? fmtZagreb(row.created_at) : ''}</td>
                        <td style={{ padding: '8px 6px' }}>{row ? fmtZagreb(row.expires_at) : ''}</td>
                        <td style={{ padding: '8px 6px' }}>
                          {!isCurrent && (
                            <button className="btn btn-logout" onClick={() => openConfirmFor(sid)}>LOG OFF SESSION</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Change password</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <input type="password" placeholder="New password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="auth-input" />
              <input type="password" placeholder="Confirm new password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} className="auth-input" />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" disabled={pwLoading} onClick={changePassword}>Change password</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConfirmationBox title={selectedSessionId ? 'Session delete confirmation' : ''} question={selectedSessionId ? `Are you sure you want to delete session with id: ${selectedSessionId} logged on: ${sessionRows[selectedSessionId || '']?.user_agent || ''}?` : ''} isOpen={confirmOpen} onConfirm={confirmDelete} onCancel={() => { setConfirmOpen(false); setSelectedSessionId(null) }} />
    </main>
  )
}
