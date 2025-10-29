import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import { useState } from 'react'
import { useSession } from '../lib/session'

const portalRoot = document.body

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { refresh } = useSession()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return ReactDOM.createPortal(
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose} aria-label="Close">×</button>

        <div style={{ padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>{mode === 'login' ? 'Login' : 'Register'}</h2>

          {mode === 'login' ? (
            <LoginForm
              onSuccess={() => {
                refresh()
                onClose()
              }}
            />
          ) : (
            <RegisterForm
              onRegistered={() => {
                // after registration switch to login form
                setMode('login')
              }}
            />
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ padding: '6px 10px', borderRadius: 8 }}>
              {mode === 'login' ? 'Create account' : 'Back to login'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot,
  )
}
