import React, { useEffect, useState } from 'react'
import searchIcon from '../assets/icons/search.png'
import searchIconWhite from '../assets/icons/search-white.png'
import { useSession } from '../lib/session'
import { createPortal } from 'react-dom'

type User = {
  user_id: number
  first_name: string
  last_name: string
  email: string
  role?: string
}

export default function UserFinder({ open, onClose, onSelect }: { open: boolean, onClose: () => void, onSelect: (userId: number) => void }) {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const { user } = useSession()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/users/reduced', { credentials: 'include' })
      .then(r => { setLoading(false); if (!r.ok) throw new Error('fetch failed'); return r.json() })
      .then((json: User[]) => {
        const list = Array.isArray(json) ? json : []
        // always exclude the currently logged-in user
        let users = list.filter(u => !(user && user.user_id && Number(u.user_id) === Number(user.user_id)))
        // if current user is NOT admin/mentor, filter out admin/mentor users
        const role = user && (user as any).role
        if (!(role === 'admin' || role === 'mentor')) {
          users = users.filter(u => !(u.role === 'admin' || u.role === 'mentor'))
        }
        setAllUsers(users)
      })
      .catch(() => setAllUsers([]))
  }, [open, user])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const terms = query.trim().toLowerCase().split(/\s+/)
    // rank users by number of matching terms
    const scored = allUsers.map(u => {
      const hay = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase()
      let score = 0
      for (const t of terms) if (hay.includes(t)) score++
      return { u, score }
    }).filter(s => s.score > 0)
    scored.sort((a, b) => b.score - a.score)
    setResults(scored.map(s => s.u))
  }, [query, allUsers])

  useEffect(() => {
    // freeze background scroll while modal open
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  if (!open) return null

  const modal = (
    <div className="userfinder-backdrop" role="dialog" aria-modal>
      <div className="userfinder-modal glass-panel">
        <div className="userfinder-header">
          <h3>Find a user registered on Poligon.</h3>
          <button className="uf-close" onClick={onClose}>×</button>
        </div>
        <div className="userfinder-body">
          <div className="userfinder-search">
            <input placeholder="Search users by name or email" value={query} onChange={e => setQuery(e.target.value)} />
            <button className="accent-btn" onClick={() => { /* trigger matching - results update automatically */ }} aria-label="Search">
              {(() => {
                const theme = (typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute('data-theme')) || 'light'
                const src = theme === 'dark' ? searchIconWhite : searchIcon
                return <img src={src} alt="Search" style={{ height: 18, width: 18 }} />
              })()}
            </button>
          </div>
          <div className="userfinder-results">
            {loading && <div className="muted">Loading users…</div>}
            {!loading && query.trim() === '' && (
              <div className="muted">Type a name or email to search users and then click on them to select them.</div>
            )}
            {!loading && results.length > 0 && (
              <table className="userfinder-table">
                <thead><tr><th>ID</th><th>First</th><th>Last</th><th>Email</th></tr></thead>
                <tbody>
                  {results.map(u => (
                    <tr key={u.user_id} className="userfinder-row" onClick={() => { onSelect(u.user_id); onClose() }}>
                      <td>{u.user_id}</td>
                      <td>{u.first_name}</td>
                      <td>{u.last_name}</td>
                      <td>{u.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && query.trim() !== '' && results.length === 0 && (
              <div className="muted">No users found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Portal the modal to document.body so it is fullscreen and not clipped by widget
  return createPortal(modal, document.body)
}
