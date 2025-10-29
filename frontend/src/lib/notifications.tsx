import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Notification = {
  id: string
  message: string
  durationMs: number
  isError?: boolean
  exiting?: boolean
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
  // Queue (pending) and visible lists
  const [queue, setQueue] = useState<Notification[]>([])
  const [visible, setVisible] = useState<Notification[]>([])
  const timers = useRef<Record<string, number>>({})
  const animTimers = useRef<Record<string, number>>({})
  const MAX_VISIBLE = 3
  const ANIM_MS = 300

  const finalizeRemove = useCallback((id: string) => {
    // remove from visible and clear any timers
    setVisible((v) => v.filter((x) => x.id !== id))
    const t = timers.current[id]
    if (t) {
      window.clearTimeout(t)
      delete timers.current[id]
    }
    const at = animTimers.current[id]
    if (at) {
      window.clearTimeout(at)
      delete animTimers.current[id]
    }
  }, [])

  const startExit = useCallback((id: string) => {
    // mark visible item as exiting
    setVisible((v) => v.map((it) => (it.id === id ? { ...it, exiting: true } : it)))
    // after animation, remove for real
    const at = window.setTimeout(() => finalizeRemove(id), ANIM_MS)
    animTimers.current[id] = at
  }, [finalizeRemove])

  // Effect: promote items from queue into visible slots whenever queue or visible changes
  useEffect(() => {
    // fast loop to move as many items as possible into visible until MAX_VISIBLE
    setVisible((currentVisible) => {
      let nextVisible = currentVisible.slice()
      setQueue((currentQueue) => {
        const qcopy = currentQueue.slice()
        while (nextVisible.length < MAX_VISIBLE && qcopy.length > 0) {
          const item = qcopy.shift()!
          nextVisible = [...nextVisible, item]
          // schedule auto-dismiss for this item
          const to = window.setTimeout(() => startExit(item.id), item.durationMs)
          timers.current[item.id] = to
        }
        return qcopy
      })
      return nextVisible
    })
  }, [queue, startExit])

  // public remove: if item is in visible, start exit; if in queue, remove directly
  const remove = useCallback((id: string) => {
    // if in visible, start animated exit
    let foundInVisible = false
    setVisible((v) => {
      foundInVisible = v.some((x) => x.id === id)
      return v
    })
    if (foundInVisible) {
      startExit(id)
      return
    }
    // otherwise remove from queue
    setQueue((q) => q.filter((x) => x.id !== id))
    const t = timers.current[id]
    if (t) {
      window.clearTimeout(t)
      delete timers.current[id]
    }
  }, [startExit])

  const push = useCallback((message: string, durationSec?: number, isError?: boolean) => {
    const msg = (message || '').trim() || (isError ? 'An error occurred' : 'Notification')
    if (!msg) return ''
    const id = `n_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
    const durationMs = durationSec ? Math.max(1000, Math.floor(durationSec * 1000)) : wordsToDurationMs(msg)
    const item: Notification = { id, message: msg, durationMs, isError }
    // enqueue (FIFO)
    setQueue((q) => [...q, item])
    return id
  }, [])

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

  // visible is filled via the promotion effect above whenever `queue` changes

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t))
      Object.values(animTimers.current).forEach((t) => window.clearTimeout(t))
    }
  }, [])

  return (
    <NotificationsContext.Provider value={{ push, remove }}>
      {children}

      {/* Notification container rendered alongside children */}
      <div aria-live="polite" className="notification-container">
        {visible.map((n) => (
          <NotificationItem key={n.id} n={n} exiting={!!n.exiting} onRequestClose={() => remove(n.id)} />
        ))}
      </div>
    </NotificationsContext.Provider>
  )
}

function NotificationItem({ n, exiting, onRequestClose }: { n: Notification; exiting?: boolean; onRequestClose: () => void }) {
  // NotificationItem is controlled by parent for its exiting state. When the dismiss button
  // is clicked it calls onRequestClose which triggers the provider to mark the item as
  // exiting and remove it after the animation completes.
  return (
    <div className={`notification-item ${n.isError ? 'is-error' : ''} ${exiting ? 'exiting' : 'entering'}`}>
      <div className="notification-content">{n.message}</div>
      <button aria-label="Dismiss" className="notification-close" onClick={onRequestClose}>
        x
      </button>
    </div>
  )
}

export default NotificationsProvider
