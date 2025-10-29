import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Notification = {
  id: string
  message: string
  durationMs: number
  isError?: boolean
}

type NotificationsContextShape = {
  push: (message: string, durationSec?: number, isError?: boolean) => string
  remove: (id: string) => void
}

const NotificationsContext = createContext<NotificationsContextShape | undefined>(undefined)

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}

function wordsToDurationMs(message: string) {
  const words = String(message).trim().split(/\s+/).filter(Boolean).length
  const seconds = Math.max(2, Math.ceil(words / 3))
  return seconds * 1000
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [list, setList] = useState<Notification[]>([])
  const timers = useRef<Record<string, number>>({})

  const remove = useCallback((id: string) => {
    setList((s) => s.filter((n) => n.id !== id))
    const t = timers.current[id]
    if (t) {
      window.clearTimeout(t)
      delete timers.current[id]
    }
  }, [])

  const push = useCallback((message: string, durationSec?: number, isError?: boolean) => {
    const msg = (message || '').trim() || (isError ? 'An error occurred' : 'Notification')
    if (!msg) return ''
    const id = `n_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
    const durationMs = durationSec ? Math.max(1000, Math.floor(durationSec * 1000)) : wordsToDurationMs(msg)
    const item: Notification = { id, message: msg, durationMs, isError }
    // new notifications appear above older ones
    setList((s) => [item, ...s])

    // schedule removal
    const to = window.setTimeout(() => remove(id), durationMs)
    timers.current[id] = to

    return id
  }, [remove])

  // expose a global helper so other non-React modules (api client) can call it
  useEffect(() => {
    ;(window as any).__pushNotification = (message: string, durationSec?: number, isError?: boolean) => {
      return push(message, durationSec, isError)
    }
    return () => {
      try {
        delete (window as any).__pushNotification
      } catch {}
    }
  }, [push])

  return (
    <NotificationsContext.Provider value={{ push, remove }}>
      {children}

      {/* Notification container rendered alongside children */}
      <div aria-live="polite" className="notification-container">
        {list.map((n) => (
          <NotificationItem key={n.id} n={n} onClose={() => remove(n.id)} />
        ))}
      </div>
    </NotificationsContext.Provider>
  )
}

function NotificationItem({ n, onClose }: { n: Notification; onClose: () => void }) {
  const [exiting, setExiting] = useState(false)
  const exit = () => {
    setExiting(true)
    // allow animation to run then remove
    setTimeout(onClose, 300)
  }

  return (
    <div className={`notification-item ${n.isError ? 'is-error' : ''} ${exiting ? 'exiting' : 'entering'}`}>
      <div className="notification-content">{n.message}</div>
      <button aria-label="Dismiss" className="notification-close" onClick={exit}>
        ×
      </button>
    </div>
  )
}

export default NotificationsProvider
