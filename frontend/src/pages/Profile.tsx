import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  const origRef = useRef<Record<string, any>>({})

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
    // prefer server-provided current_session_id (handles HttpOnly cookies)
    setCurrentSessionId(normalizeSessionId(st.current_session_id ?? getSessionIdFromCookie()))

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

  // helper to copy text to clipboard with a fallback for older browsers
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        notifier.push('Copied to clipboard', 2)
        return true
      }
    } catch (e) {
      // fallthrough to legacy method
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) {
        notifier.push('Copied to clipboard', 2)
        return true
      }
    } catch (e) {
      // ignore
    }
    notifier.push('Copy failed (clipboard unavailable)', undefined, true)
    return false
  }

  useEffect(() => {
    if (user) {
      setEditable({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        preferred_language: user.preferred_language || '',
        principal_name: user.principal_name || user.email || '',
        // display_name is a standalone DB field, do not compute from first/last
        display_name: user.display_name || '',
      })
      // store original values to compare for dirty checks
      origRef.current = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        preferred_language: user.preferred_language || '',
        principal_name: user.principal_name || user.email || '',
        // treat display_name as stored value
        display_name: user.display_name || '',
      }
    }
  }, [user])

  async function saveField(field: string) {
    if (!user) return
    const payload: any = {}
    payload[field] = editable[field]
    try {
      await apiFetch(`/api/users/${user.user_id}`, { method: 'PUT', body: JSON.stringify(payload) })
      notifier.push(`Field ${field} successfully saved on database!`, 3)
      // mark saved as no longer dirty and update original value snapshot
      origRef.current = { ...origRef.current, [field]: editable[field] }
      setDirty((d) => ({ ...d, [field]: false }))
      // refresh session/user info to ensure server state sync
      await refresh()
    } catch (err: any) {
      notifier.push(String(err?.message || err), undefined, true)
    }
  }

  function onChangeField(field: string, value: any) {
    setEditable((s) => ({ ...s, [field]: value }))
    // compute dirty by comparing to original snapshot; ensures reverting hides Save
    const orig = origRef.current?.[field]
    const isDirty = (orig ?? '') !== (value ?? '')
    setDirty((d) => ({ ...d, [field]: isDirty }))
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

  // Normalize session id values from various sources so comparisons are reliable.
  const normalizeSessionId = (raw: string | null | undefined) => {
    if (!raw) return null
    try {
      let v = String(raw)
      // sometimes backend or frontend may provide encoded values
      v = decodeURIComponent(v)
      if (v.startsWith('s:')) v = v.slice(2)
      if (v.includes('.')) v = v.split('.')[0]
      return v
    } catch (e) {
      return String(raw)
    }
  }

  // Keep current session id in state. Initialize from cookie (best-effort),
  // but overwrite with server-provided `current_session_id` when we fetch /auth/status.
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => normalizeSessionId(getSessionIdFromCookie()))

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
    // prefer server-provided current_session_id (handles HttpOnly cookies)
    setCurrentSessionId(normalizeSessionId(st.current_session_id ?? getSessionIdFromCookie()))
      // remove from rows
      setSessionRows((r) => {
        const copy = { ...r }
        delete copy[selectedSessionId]
        return copy
      })
      // if we deleted current session, force logout/refresh
      const deletedRowSessionId = sessionRows[selectedSessionId || '']?.session?.session_id || selectedSessionId
      if (normalizeSessionId(deletedRowSessionId) === currentSessionId) {
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
  const [showNewPass, setShowNewPass] = useState(false)

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
      // show a professional confirmation message with a 10s countdown
      // We'll update the notification each second so it displays remaining seconds.
      const TOTAL = 10
      let remaining = TOTAL

      const makeMsg = (s: number) => `Password successfully changed. For security reasons, you will be logged out in ${s} second${s === 1 ? '' : 's'}. Please sign in again using your new password.`

      // push initial notification with full TTL
      let notifId = notifier.push(makeMsg(remaining), TOTAL)

      const iv = window.setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          // final tick - stop the interval (logout will happen from the timeout below)
          window.clearInterval(iv)
          return
        }
        // update the existing notification in-place with remaining seconds
        try { notifier.update(notifId, makeMsg(remaining), remaining) } catch (e) {}
      }, 1000)

      // after TOTAL seconds, logout and reload
      setTimeout(async () => {
        window.clearInterval(iv)
        try { await postJSON('/api/auth/logout', {}) } catch (e) {}
        window.location.reload()
      }, TOTAL * 1000)
    } catch (err: any) {
      notifier.push(String(err?.message || err), undefined, true)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <main>
      <h1 style={{ color: 'var(--heading-2)' }}>Profile</h1>

      {/* Stack blocks vertically: General information, Active sessions, Change password */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginBottom: '2.5rem', alignItems: 'stretch' }}>
        <div className="glass-panel profile-card" style={{ padding: '1.25rem', width: '100%' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.25rem' }}>General information</h3>
          {!user && <p>Loading...</p>}
          {user && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {/* First and Last name on same row */}
              <div className="name-row">
                <div className="col input-with-save">
                  <label className="auth-label">first name</label>
                  <input className="auth-input" value={editable.first_name || ''} onChange={(e) => onChangeField('first_name', e.target.value)} />
                  {dirty.first_name ? (
                    <button className="save-btn btn btn-primary" onClick={() => saveField('first_name')}>Save</button>
                  ) : null}
                </div>
                <div className="col input-with-save">
                  <label className="auth-label">last name</label>
                  <input className="auth-input" value={editable.last_name || ''} onChange={(e) => onChangeField('last_name', e.target.value)} />
                  {dirty.last_name ? (
                    <button className="save-btn btn btn-primary" onClick={() => saveField('last_name')}>Save</button>
                  ) : null}
                </div>
              </div>

              {/* Preferred language + timestamps centered together */}
              <div className="field-row" style={{ alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                <div className="col input-with-save" style={{ alignItems: 'flex-start' }}>
                  <label className="auth-label">preferred language</label>
                  <select className="auth-input auth-select" value={editable.preferred_language || ''} onChange={(e) => onChangeField('preferred_language', e.target.value)}>
                    <option value="hr">hr</option>
                    <option value="en">en</option>
                  </select>
                  {dirty.preferred_language ? (
                    <button className="save-btn btn btn-primary" onClick={() => saveField('preferred_language')}>Save</button>
                  ) : null}
                </div>

                <div className="timestamps" style={{ textAlign: 'left', alignSelf: 'center' }}>
                  <div className="ts">created: <strong>{fmtZagreb(userData?.created_at || user.created_at)}</strong></div>
                  <div className="ts">updated: <strong>{fmtZagreb(userData?.updated_at || user.updated_at)}</strong></div>
                </div>
              </div>

              {/* Principal name and Display name on same row */}
              <div className="name-row">
                <div className="col input-with-save">
                  <label className="auth-label">principal name</label>
                  <input className="auth-input" value={editable.principal_name || ''} onChange={(e) => onChangeField('principal_name', e.target.value)} />
                  {dirty.principal_name ? (
                    <button className="save-btn btn btn-primary" onClick={() => saveField('principal_name')}>Save</button>
                  ) : null}
                </div>
                <div className="col input-with-save">
                  <label className="auth-label">display name</label>
                  <input className="auth-input" value={editable.display_name || ''} onChange={(e) => onChangeField('display_name', e.target.value)} />
                  {dirty.display_name ? (
                    <button className="save-btn btn btn-primary" onClick={() => saveField('display_name')}>Save</button>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ color: 'var(--muted)', fontSize: '1rem' }}>Role: <strong>{user.role}</strong> (read-only)</div>
                <div style={{ color: 'var(--muted)', fontSize: '1rem' }}>Affiliation: <strong>{user.affiliation || '—'}</strong></div>
                <div style={{ color: 'var(--muted)', fontSize: '1rem' }}>Email: <strong>{user.email}</strong></div>
                <div style={{ color: 'var(--muted)', fontSize: '1rem' }}>UserID: <strong>{user.user_id ?? user.id ?? '—'}</strong></div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel profile-card" style={{ padding: '1.25rem', width: '100%' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.25rem' }}>Active sessions</h3>
          <div>
            <table className="session-table" style={{ width: '100%' }}>
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
                  // some session rows store the actual session id under row.session.session_id
                  // or under row.session_id; fall back to the active_sessions id (sid)
                  const rowSessionIdRaw = row?.session?.session_id ?? row?.session_id ?? sid
                  const isCurrent = normalizeSessionId(rowSessionIdRaw) === currentSessionId
                  return (
                    <tr key={sid} className={isCurrent ? 'session-current' : ''}>
                          <td className="session-id" style={{ maxWidth: '28vw' }}>
                            <button
                              className="btn btn-ghost"
                              onClick={async () => {
                                // prefer the canonical session id value stored in row if available
                                const rowSessionIdRaw = row?.session?.session_id ?? row?.session_id ?? sid
                                const normalized = normalizeSessionId(rowSessionIdRaw)
                                await copyToClipboard(String(normalized || rowSessionIdRaw || sid))
                              }}
                            >
                              {String((row?.session?.session_id ?? row?.session_id ?? sid) || '').slice(0, 12)}…
                            </button>
                          </td>
                      <td>{row ? row.last_route || '—' : '—'}</td>
                      <td className="user-agent" style={{ maxWidth: '36vw' }} title={row ? row.user_agent : ''}>{row ? (row.user_agent || '—') : '—'}</td>
                      <td>{row ? (row.ip_address || '') : ''}</td>
                      <td>{row ? fmtZagreb(row.created_at) : ''}</td>
                      <td>{row ? fmtZagreb(row.expires_at) : ''}</td>
                      <td>
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

        <div className="glass-panel profile-card" style={{ padding: '1.25rem', width: '100%' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.25rem' }}>Change password</h3>
              <div className="password-area">
                <div className="pw-input-wrapper">
                  <input type={showNewPass ? 'text' : 'password'} placeholder="New password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="auth-input" />
                  <span
                    role="button"
                    tabIndex={0}
                    className="pw-toggle"
                    aria-pressed={showNewPass}
                    aria-label={showNewPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowNewPass(s => !s)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowNewPass(s => !s) } }}
                  >{showNewPass ? 'Hide' : 'Show'}</span>
                </div>
                <input type="password" placeholder="Confirm new password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} className="auth-input" />
                <div className="actions">
                  <button className="btn btn-primary" style={{ minWidth: 160 }} disabled={pwLoading} onClick={changePassword}>Change password</button>
                </div>
              </div>
        </div>
      </section>

      <ConfirmationBox title={selectedSessionId ? 'Session delete confirmation' : ''} question={selectedSessionId ? `Are you sure you want to delete session with id: ${selectedSessionId} logged on: ${sessionRows[selectedSessionId || '']?.user_agent || ''}?` : ''} isOpen={confirmOpen} onConfirm={confirmDelete} onCancel={() => { setConfirmOpen(false); setSelectedSessionId(null) }} />
    </main>
  )
}
