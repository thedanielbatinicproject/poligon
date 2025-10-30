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
  const visibleRef = useRef<Notification[]>([])
  const timers = useRef<Record<string, number>>({})
  const animTimers = useRef<Record<string, number>>({})
  const MAX_VISIBLE = 3
  const ANIM_MS = 260

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
    if (!queue || queue.length === 0) return
    // try to promote as many as space allows
    setVisible((currentVisible) => {
      const space = Math.max(0, MAX_VISIBLE - currentVisible.length)
      if (space <= 0) return currentVisible
      const promoteCount = Math.min(space, queue.length)
      if (promoteCount <= 0) return currentVisible

      const toPromote = queue.slice(0, promoteCount)
      const remaining = queue.slice(promoteCount)

      toPromote.forEach((item) => {
        const to = window.setTimeout(() => startExit(item.id), item.durationMs)
        timers.current[item.id] = to
      })

      // update queue to remaining items
      setQueue(remaining)
      const next = [...currentVisible, ...toPromote]
      return next
    })
  }, [queue, visible.length, startExit])

  // keep a ref of visible for sync checks inside event handlers
  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  // public remove: if item is in visible, start exit; if in queue, remove directly
  const remove = useCallback((id: string) => {
    // synchronous check against ref to avoid relying on async setState
    const isVisible = visibleRef.current.some((x) => x.id === id)
    if (isVisible) {
      // start animated exit for the clicked item
      startExit(id)

      // immediately promote one item from the queue (if any) so the queue keeps draining
      setQueue((prevQueue) => {
        if (!prevQueue || prevQueue.length === 0) return prevQueue
        const qcopy = prevQueue.slice()
        const next = qcopy.shift()!
        // add next to visible immediately
        setVisible((v) => {
          const to = window.setTimeout(() => startExit(next.id), next.durationMs)
          timers.current[next.id] = to
          return [...v, next]
        })
        return qcopy
      })

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
  const handleClick = (e: React.MouseEvent) => {
    onRequestClose()
  }

  return (
    <div className={`notification-item ${n.isError ? 'is-error' : ''} ${exiting ? 'exiting' : 'entering'}`}>
      <div className="notification-content">{n.message}</div>
      <button type="button" aria-label="Dismiss" className="notification-close" onClick={handleClick}>
        ×
      </button>
    </div>
  )
}

export default NotificationsProvider
