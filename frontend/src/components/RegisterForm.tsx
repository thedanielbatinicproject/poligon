import React, { useState } from 'react'
import { useSession } from '../lib/session'

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
      setSuccessMsg('Registration successful. Please check your email for login details.')
      onRegistered && onRegistered()
    } catch (err: any) {
      setError(err?.body?.error || err?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: '100%', padding: 8, borderRadius: 6 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>First name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ width: '100%', padding: 8, borderRadius: 6 }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Last name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ width: '100%', padding: 8, borderRadius: 6 }} />
        </div>
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      {successMsg && <div style={{ color: 'green', marginBottom: 8 }}>{successMsg}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={loading} style={{ padding: '8px 14px', borderRadius: 8 }}>
          {loading ? 'Registering…' : 'Register'}
        </button>
      </div>
    </form>
  )
}
