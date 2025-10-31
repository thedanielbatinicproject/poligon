import React, { useEffect, useRef, useState } from 'react'
import { useSocket } from './SocketProvider'
import { useSession } from '../lib/session'

type Partner = {
  other_id: number
  last_at?: string
}

// Inline ChatWindow to avoid module resolution issues with project TS config
function ChatWindowInline({ partnerId, onClose }: { partnerId: number, onClose: () => void }) {
  const { socket } = useSocket()
  const { user } = useSession()
  type Msg = {
    message_id?: number | string
    sender_id: number
    receiver_id: number
    message_content: string
    sent_at: string
    status?: 'sending' | 'sent' | 'error'
  }
  const [allMessages, setAllMessages] = React.useState<Msg[]>([])
  const [displayCount, setDisplayCount] = React.useState(50)
  const [body, setBody] = React.useState('')
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
  const res = await fetch(`/api/utility/messages/${partnerId}`, { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        json.sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
        setAllMessages(json)
        setTimeout(() => { scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight) }, 50)
      } catch (e) {}
    }
    load()
    return () => { cancelled = true }
  }, [partnerId])

  React.useEffect(() => {
    if (!socket) return
    function onReceive(payload: any) {
      const other = payload.sender_id === user?.user_id ? payload.receiver_id : payload.sender_id
      if (other !== partnerId) return
      setAllMessages(prev => [...prev, payload])
      setTimeout(() => { scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight) }, 20)
    }
    socket.on('receive_message', onReceive)
    return () => { socket.off('receive_message', onReceive) }
  }, [socket, partnerId, user?.user_id])

  const visible = allMessages.slice(Math.max(0, allMessages.length - displayCount))

  function loadMore() { setDisplayCount(c => Math.min(allMessages.length, c + 50)) }

  async function send() {
    if (!body.trim() || !user) return
    const tempId = 't_' + Date.now()
    const msg: Msg = {
      message_id: tempId,
      sender_id: user.user_id,
      receiver_id: partnerId,
      message_content: body,
      sent_at: new Date().toISOString(),
      status: 'sending'
    }
    setAllMessages(prev => [...prev, msg])
    setBody('')
    try {
      const res = await fetch('/api/utility/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ receiver_id: partnerId, message_content: msg.message_content })
      })
      if (!res.ok) throw new Error('send failed')
      const json = await res.json()
      setAllMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, message_id: json.message_id ?? m.message_id, status: 'sent' } : m))
    } catch (e) {
      setAllMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, status: 'error' } : m))
    }
    setTimeout(() => { scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight) }, 20)
  }

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div>Conversation with User {partnerId}</div>
        <div style={{ cursor: 'pointer' }} onClick={onClose}>×</div>
      </div>
      <div className="chat-window-body" ref={scrollerRef}>
        {displayCount < allMessages.length && (
          <div className="load-more" onClick={loadMore}>Load earlier messages</div>
        )}
        {visible.map((m, i) => {
          const mine = m.sender_id === user?.user_id
          return (
            <div key={m.message_id ?? i} className={"message " + (mine ? 'sent' : 'received')}>
              <div className="message-content">{m.message_content}</div>
              <div className="message-meta muted">{new Date(m.sent_at).toLocaleString()} {m.status ? ` • ${m.status}` : ''}</div>
            </div>
          )
        })}
      </div>
      <div className="chat-window-compose">
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type a message" />
        <div className="compose-actions">
          <button onClick={send} className="btn primary">Send</button>
        </div>
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const { socket } = useSocket()
  const { user } = useSession()
  // open by default if a user is already logged in; otherwise closed.
  const [open, setOpen] = useState<boolean>(() => Boolean(user))
  const [partners, setPartners] = useState<Partner[]>([])
  const [activePartner, setActivePartner] = useState<number | null>(null)
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const posRef = useRef({ x: 20, y: 80 })
  const dragging = useRef(false)
  const wasDragged = useRef(false)
  const capturedElRef = useRef<HTMLElement | null>(null)
  const movedOnce = useRef(false)

  useEffect(() => {
    // load partners only for logged-in users
    if (!user) {
      setPartners([])
      return
    }
    async function load() {
      try {
  const res = await fetch('/api/utility/messages/partners', { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        setPartners(json)
      } catch (e) {
        // ignore
      }
    }
    load()
  }, [user])

  useEffect(() => {
    if (!socket) return
    function onReceive(payload: any) {
      // if partner list doesn't include this user, refresh partners
      const other = payload.sender_id === user?.user_id ? payload.receiver_id : payload.sender_id
      const found = partners.find(p => p.other_id === other)
      if (!found) {
  // reload partners simply
  fetch('/api/utility/messages/partners', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(j => j && setPartners(j)).catch(() => {})
      }
    }
    socket.on('receive_message', onReceive)
    return () => { socket.off('receive_message', onReceive) }
  }, [socket, partners, user?.user_id])

  // When user becomes available, ensure widget is open by default.
  useEffect(() => {
    if (user) setOpen(true)
    else setOpen(false)
  }, [user])

  // improved drag handlers: use React pointer events attached to the header element
  // This is more reliable across browsers/environments than trying to attach
  // native listeners to the container and avoids some edge-cases where handlers
  // were not firing in the user's environment.
  const startRef = useRef({ x: 0, y: 0 })
  const movedRef = useRef(false)

  function onPointerMoveDocument(e: PointerEvent) {
    if (!dragging.current) return
    const el = widgetRef.current
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (!movedRef.current && Math.abs(dx) < 2 && Math.abs(dy) < 2) return
    movedRef.current = true
    movedOnce.current = true
    wasDragged.current = true
    startRef.current.x = e.clientX
    startRef.current.y = e.clientY
    // compute tentative positions
    let nx = posRef.current.x + dx
    let ny = posRef.current.y + dy
    // clamp to viewport so widget cannot be dragged off-screen
    if (el) {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = el.offsetWidth || 320
      const h = el.offsetHeight || 200
      nx = Math.max(8, Math.min(nx, vw - w - 8))
      ny = Math.max(8, Math.min(ny, vh - h - 8))
    } else {
      nx = Math.max(8, nx)
      ny = Math.max(8, ny)
    }
    posRef.current.x = nx
    posRef.current.y = ny
    if (el) {
      el.style.right = 'auto'
      el.style.bottom = 'auto'
      el.style.left = posRef.current.x + 'px'
      el.style.top = posRef.current.y + 'px'
    }
  }

  function onPointerUpDocument(e: PointerEvent) {
    dragging.current = false
    document.removeEventListener('pointermove', onPointerMoveDocument)
    document.removeEventListener('pointerup', onPointerUpDocument)
    try {
      if (capturedElRef.current && typeof (e as any).pointerId !== 'undefined' && capturedElRef.current.releasePointerCapture) {
        capturedElRef.current.releasePointerCapture((e as any).pointerId)
      }
    } catch (err) {}
    capturedElRef.current = null
    setTimeout(() => { wasDragged.current = false }, 50)
  }

  function handleHeaderPointerDown(e: React.PointerEvent<HTMLElement>) {
    // only primary pointer
    if (e.isPrimary === false) return
    // start tracking
    dragging.current = true
    movedRef.current = false
    startRef.current.x = e.clientX
    startRef.current.y = e.clientY
    // If the widget was using bottom/right anchoring (default spawn), convert
    // to left/top coordinates now so subsequent moves don't "teleport" to the
    // old initial top-left values. Use getBoundingClientRect to compute
    // current visual position relative to the viewport.
    const el = widgetRef.current
    if (el && !movedOnce.current) {
      try {
        const r = el.getBoundingClientRect()
        // clamp initial position to viewport
        const vw = window.innerWidth
        const vh = window.innerHeight
        const w = el.offsetWidth || 320
        const h = el.offsetHeight || 200
        posRef.current.x = Math.max(8, Math.min(Math.round(r.left), vw - w - 8))
        posRef.current.y = Math.max(8, Math.min(Math.round(r.top), vh - h - 8))
        el.style.left = posRef.current.x + 'px'
        el.style.top = posRef.current.y + 'px'
        el.style.right = 'auto'
        el.style.bottom = 'auto'
        movedOnce.current = true
      } catch (err) {
        // ignore
      }
    }
    // try to capture pointer on the header element so we reliably receive events
    try { (e.currentTarget as HTMLElement).setPointerCapture && (e.currentTarget as HTMLElement).setPointerCapture((e as any).pointerId); capturedElRef.current = e.currentTarget as HTMLElement } catch (err) {}
    document.addEventListener('pointermove', onPointerMoveDocument)
    document.addEventListener('pointerup', onPointerUpDocument)
  }

  // Don't render the chatbox at all for unauthenticated users
  // (render decision is applied after all hooks to avoid changing hook order)

  // Ensure widget position remains onscreen on viewport resize
  useEffect(() => {
    function onResize() {
      const el = widgetRef.current
      if (!el) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = el.offsetWidth || 320
      const h = el.offsetHeight || 200
      let nx = posRef.current.x
      let ny = posRef.current.y
      // if still anchored bottom/right (not movedOnce), nothing to do
      if (!movedOnce.current) return
      nx = Math.max(8, Math.min(nx, vw - w - 8))
      ny = Math.max(8, Math.min(ny, vh - h - 8))
      posRef.current.x = nx
      posRef.current.y = ny
      el.style.left = posRef.current.x + 'px'
      el.style.top = posRef.current.y + 'px'
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!user) return null

  return (
    <div
      ref={widgetRef}
      className={`chat-widget ${open ? 'open' : ''}`}
      style={ movedOnce.current ? { left: posRef.current.x + 'px', top: posRef.current.y + 'px', position: 'fixed', zIndex: 9999 } : { right: '20px', bottom: '80px', position: 'fixed', zIndex: 9999 } }
    >
      <div
        className="chat-widget-header"
        onClick={() => { if (wasDragged.current) { wasDragged.current = false; return } setOpen(s => !s) }}
        onPointerDown={handleHeaderPointerDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong>Chat</strong>
          <span className="chat-badge">{partners.length}</span>
        </div>
        <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`chat-chevron ${open ? 'open' : ''}`} style={{ fontSize: 12, color: 'var(--muted)', transition: 'transform .3s ease' }}>{open ? '▾' : '▸'}</div>
        </div>
      </div>
      <div className={`chat-widget-body ${open ? 'open' : 'closed'}`}>
          <div className="chat-partners">
            {partners.length === 0 && <div className="muted">No conversations yet</div>}
            {partners.map(p => (
              <div key={p.other_id} className="partner-row" onClick={() => setActivePartner(p.other_id)}>
                <div className="partner-name">User {p.other_id}</div>
                <div className="partner-last muted">{p.last_at ? new Date(p.last_at).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
          {activePartner && (
            <ChatWindowInline partnerId={activePartner} onClose={() => setActivePartner(null)} />
          )}
      </div>
    </div>
  )
}
