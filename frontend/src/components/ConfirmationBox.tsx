import React, { useEffect } from 'react'

type Props = {
  title: string
  question: string
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationBox({ title, question, isOpen, onConfirm, onCancel }: Props) {
  if (!isOpen) return null

  // lock body scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    // prevent scroll
    document.body.style.overflow = 'hidden'
    // avoid layout shift when scrollbar disappears by preserving padding-right (simple approach)
    // compute scrollbar width
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`
    return () => {
      document.body.style.overflow = prevOverflow || ''
      document.body.style.paddingRight = prevPaddingRight || ''
    }
  }, [])

  return (
    <div className="auth-modal-overlay confirm-overlay" role="dialog" aria-modal="true">
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
