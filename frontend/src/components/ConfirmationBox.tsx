import React from 'react'

type Props = {
  title: string
  question: string
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationBox({ title, question, isOpen, onConfirm, onCancel }: Props) {
  if (!isOpen) return null

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true">
      <div className="auth-modal glass-panel" style={{ maxWidth: 640 }}>
        <button className="auth-close" aria-label="Close" onClick={onCancel}>×</button>
        <div style={{ padding: 18 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, color: 'var(--heading-2)' }}>{title}</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 18 }}>{question}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onCancel} className="btn btn-ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>NO</button>
            <button onClick={onConfirm} className="btn" style={{ background: 'linear-gradient(90deg,var(--success),var(--accent))', color: 'white' }}>YES</button>
          </div>
        </div>
      </div>
    </div>
  )
}
