import React, { useState } from 'react'
import { useSession } from '../lib/session'
import { useNotifications } from '../lib/notifications'

export default function RegisterForm({ onRegistered }: { onRegistered?: () => void }) {
  const { registerLocal } = useSession()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body = await registerLocal({ email, first_name: firstName, last_name: lastName })
      // backend will send email; do not auto-login. Show a success message and call onRegistered
  const msg = 'Registration successful. Please check your email for login details.'
  setSuccessMsg(msg)
  // Show a longer-lived notification for registration confirmation (8 seconds)
  try { push(msg, 8) } catch (e) {}
      onRegistered && onRegistered()
    } catch (err: any) {
      setError(err?.body?.error || err?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const { push } = useNotifications()

  return (
    <form onSubmit={submit} className="auth-form">
      <div className="auth-input">
        <label className="auth-label">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </div>

      <div className="auth-input">
        <label className="auth-label">First name</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </div>

      <div className="auth-input">
        <label className="auth-label">Last name</label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</div>}
      {successMsg && <div style={{ color: 'var(--success)', marginBottom: 8 }}>{successMsg}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
          {loading ? 'Registering…' : 'Register'}
        </button>
      </div>
    </form>
  )
}
