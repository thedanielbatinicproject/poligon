import React, { useEffect, useRef } from 'react'

type Props = {
  title: string
  question: string
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationBox({ title, question, isOpen, onConfirm, onCancel }: Props) {
  // Keep refs to previous body styles so we can always restore them.
  const prevOverflowRef = useRef<string | null>(null)
  const prevPaddingRef = useRef<string | null>(null)

  // Manage scroll lock based on isOpen. This effect runs on mount, unmount, and whenever isOpen changes.
  useEffect(() => {
    try {
      if (isOpen) {
        // save previous styles only once
        if (prevOverflowRef.current === null) prevOverflowRef.current = document.body.style.overflow
        if (prevPaddingRef.current === null) prevPaddingRef.current = document.body.style.paddingRight

        // lock scroll
        document.body.style.overflow = 'hidden'
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
        if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`
      } else {
        // restore when modal closes
        if (prevOverflowRef.current !== null) {
          document.body.style.overflow = prevOverflowRef.current || ''
          prevOverflowRef.current = null
        }
        if (prevPaddingRef.current !== null) {
          document.body.style.paddingRight = prevPaddingRef.current || ''
          prevPaddingRef.current = null
        }
      }
    } catch (e) {
      // ignore DOM errors (very unlikely)
      console.warn('ConfirmationBox: failed to toggle body scroll', e)
    }

    // Cleanup on unmount: ensure we restore original values if still stored
    return () => {
      try {
        if (prevOverflowRef.current !== null) {
          document.body.style.overflow = prevOverflowRef.current || ''
          prevOverflowRef.current = null
        }
        if (prevPaddingRef.current !== null) {
          document.body.style.paddingRight = prevPaddingRef.current || ''
          prevPaddingRef.current = null
        }
      } catch (e) {
        console.warn('ConfirmationBox cleanup error', e)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="auth-modal-overlay confirm-overlay" role="dialog" aria-modal="true">
      <div className="auth-modal glass-panel" style={{ maxWidth: 640 }}>
        <button className="auth-close" aria-label="Close" onClick={onCancel}>×</button>
        <div style={{ padding: 18 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, color: 'var(--heading-2)' }}>{title}</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 18 }}>{question}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onCancel} className="btn btn-ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>NO</button>
            <button onClick={onConfirm} className="btn confirm-yes">YES</button>
          </div>
        </div>
      </div>
    </div>
  )
}
