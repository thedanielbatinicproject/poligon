import React, { useState } from 'react'
import { useSession } from '../lib/session'
import { useNotifications } from '../lib/notifications'
import { useTheme } from '../lib/theme'
import aaieduImg from '../assets/images/aaieduhr.png'
import aaieduImgDark from '../assets/images/aaieduhr-darktheme.png'

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
      try { push('Login successful!') } catch (e) {}
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
      try { push('Login successful!') } catch (e) {}
      onSuccess && onSuccess()
    } catch (e: any) {
      // Popup blocked or timed out
      setError(e?.message || 'AAI login failed or timed out')
    }
  }

  const { theme } = useTheme()
  const { push } = useNotifications()

  const aaiSrc = theme === 'dark' ? aaieduImgDark : aaieduImg

  return (
    <div className="glass-panel">
      <div style={{ marginBottom: 6 }}>
        <div className="auth-heading">Login with AAI@EduHr</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={handleAaiClick} className="aaiedu-btn" aria-label="Login with AAIedu.hr">
            <img src={aaiSrc} alt="AAIedu.hr" className="aaiedu-img" />
          </button>
        </div>
      </div>

      <div className="auth-sep" />

      <div style={{ marginBottom: 8 }} className="auth-heading">Login with internal credentials</div>

      <form onSubmit={handleLocalLogin} aria-label="Local login form" className="auth-form">
        <div className="auth-input">
          <label className="auth-label">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>

        <div className="auth-input">
          <label className="auth-label">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: 10, fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  )
}