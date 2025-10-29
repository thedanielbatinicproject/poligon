import React, { useState } from 'react'
import { useSession } from '../lib/session'
import aaieduImg from '../assets/images/aaieduhr.png'

type Props = {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: Props) {
  const { loginLocal, openAaiPopup } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLocalLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginLocal(email.trim(), password)
      onSuccess && onSuccess()
    } catch (err: any) {
      // backend errors normalized by api client: err.body or err.message
      const msg = err?.body?.error || err?.body?.message || err?.message || 'Login failed'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  async function handleAaiClick() {
    setError(null)
    try {
      await openAaiPopup()
      onSuccess && onSuccess()
    } catch (e: any) {
      // Popup blocked or timed out
      setError(e?.message || 'AAI login failed or timed out')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleAaiClick}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
          aria-label="Login with AAIedu.hr"
        >
          <img src={aaieduImg} alt="AAIedu.hr" style={{ height: 44 }} />
        </button>
      </div>

      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '12px 0' }} />

      <form onSubmit={handleLocalLogin} aria-label="Local login form">
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e6e9ee',
              outline: 'none',
              boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.8)',
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e6e9ee',
              outline: 'none',
              boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.8)',
            }}
          />
        </div>

        {error && (
          <div style={{ color: 'crimson', marginBottom: 10, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: '#0b63d1',
              color: '#fff',
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 4px 12px rgba(11,99,209,0.12)',
              transition: 'transform 140ms ease, box-shadow 140ms ease',
            }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  )
}