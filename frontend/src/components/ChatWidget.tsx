import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSocket } from './SocketProvider'
import { useSession } from '../lib/session'
import UserFinder from './UserFinder'

type Partner = {
  other_id: number
  last_at?: string
  // whether we attempted to load last_at via messages fetch
  _loaded_last_at?: boolean
  // optional role (provided by backend when available)
  role?: string
}

// Inline ChatWindow to avoid module resolution issues with project TS config
function ChatWindowInline({ partnerId, onClose, partnerName, onMessageSent }: { partnerId: number, onClose: () => void, partnerName?: string, onMessageSent?: (id: number, sent_at: string) => void }) {
  const { socket, presence } = useSocket()
  const { user, session } = useSession()
  type Msg = {
    message_id?: number | string
    sender_id: number
    receiver_id: number
    message_content: string
    sent_at: string
    status?: 'sending' | 'sent' | 'error'
  }
  const [allMessages, setAllMessages] = React.useState<Msg[]>([])
  const [initialLoadedCount, setInitialLoadedCount] = React.useState<number | null>(null)
  const [displayCount, setDisplayCount] = React.useState(50)
  const [body, setBody] = React.useState('')
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)
  const [contextMenu, setContextMenu] = React.useState<{ visible: boolean, x: number, y: number, messageId?: number | string }>({ visible: false, x: 0, y: 0 })
  const lastOpenRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      // reset the visual counter when switching partners
      setInitialLoadedCount(null)
      try {
        const res = await fetch(`/api/utility/messages/${partnerId}`, { credentials: 'include' })
        if (!res.ok) {
          console.warn('[ChatWindowInline] messages fetch not ok', res.status, partnerId)
          // ensure the header doesn't stay in 'loading…' state forever
          setInitialLoadedCount(0)
          return
        }
        const json = await res.json()
        // normalize possible shapes: Array or { rows: Array }
        let msgs: any[] = []
        if (Array.isArray(json)) msgs = json
        else if (json && Array.isArray((json as any).rows)) msgs = (json as any).rows
        else {
          console.warn('[ChatWindowInline] unexpected messages response shape for partnerId=', partnerId, json)
        }
        if (msgs.length === 0) {
          // no messages returned for this partner
        }
        if (cancelled) return
  try { msgs.sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()) } catch (err) {}
        setAllMessages(msgs)
        // record how many messages the initial fetch returned (for quick visual debugging)
        setInitialLoadedCount(msgs.length)
        setTimeout(() => { scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight) }, 50)
      } catch (e) {
        console.error('[ChatWindowInline] messages fetch failed', e)
        // ensure we don't stay stuck showing 'loading…'
        setInitialLoadedCount(0)
      }
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

  // Listen for remote deletions so both sender and receiver remove the message in real time
  React.useEffect(() => {
    if (!socket) return
    function onDeleted(payload: any) {
      try {
        const { message_id, sender_id, receiver_id } = payload || {}
        // Determine whether this deletion belongs to the conversation currently open
        const convoOther = (sender_id === user?.user_id) ? receiver_id : sender_id
        if (convoOther !== partnerId) return
        setAllMessages(prev => prev.filter(m => String(m.message_id) !== String(message_id)))
      } catch (e) {
        // ignore
      }
    }
    socket.on('message_deleted', onDeleted)
    return () => { socket.off('message_deleted', onDeleted) }
  }, [socket, partnerId, user?.user_id])

  // close context menu on outside click or Escape; ignore immediate click after contextmenu (browser quirk)
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (lastOpenRef.current && (Date.now() - lastOpenRef.current) < 300) {
        lastOpenRef.current = null
        return
      }
      if (contextMenu.visible) setContextMenu({ visible: false, x: 0, y: 0 })
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && contextMenu.visible) setContextMenu({ visible: false, x: 0, y: 0 }) }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [contextMenu.visible])

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
      // notify parent so partners list can be updated immediately
      try { onMessageSent && onMessageSent(partnerId, msg.sent_at) } catch (e) {}
    } catch (e) {
      setAllMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, status: 'error' } : m))
    }
    setTimeout(() => { scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight) }, 20)
  }

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="chat-window-title">Conversation with {partnerName ? partnerName : `admin (userid: ${partnerId})`}</div>
              {presence && presence[Number(partnerId)] && (
                <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.78rem' }}> (ONLINE)</div>
              )}
            </div>
          </div>
          <div style={{ marginLeft: 12 }} className="muted">{initialLoadedCount === null ? 'loading…' : (initialLoadedCount === 1 ? '1 message loaded' : `${initialLoadedCount} messages loaded`)}</div>
        </div>
        <div>
          <button className="dm-return" onClick={onClose}>Return</button>
        </div>
      </div>
      <div className="chat-window-body" ref={scrollerRef} onContextMenu={(e) => {
        try {
          const tgt = e.target as HTMLElement | null
          const msgEl = tgt ? tgt.closest('.message') as HTMLElement | null : null
          // Only open our delete context menu for messages that are marked as "sent" (i.e. messages the user sent)
          if (msgEl && msgEl.classList.contains('sent')) {
            e.preventDefault()
            const mid = msgEl.getAttribute('data-message-id')
            lastOpenRef.current = Date.now()
            setContextMenu({ visible: true, x: (e as any).clientX, y: (e as any).clientY, messageId: mid ?? undefined })
          }
  } catch { }
      }}>
        {displayCount < allMessages.length && (
          <div className="load-more" onClick={loadMore}>Load earlier messages</div>
        )}
        {visible.map((m, i) => {
          const mine = m.sender_id === user?.user_id
          return (
            <div key={m.message_id ?? i} data-message-id={m.message_id} className={"message " + (mine ? 'sent' : 'received')}>
              <div className="message-content">{m.message_content}</div>
              <div className="message-meta muted">{new Date(m.sent_at).toLocaleString()} {m.status ? ` • ${m.status}` : ''}</div>
            </div>
          )
        })}
        {contextMenu.visible && (typeof document !== 'undefined') && createPortal(
          <div className="message-context-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 120000 }}>
            <button className="delete-message-btn" onClick={async () => {
              const id = contextMenu.messageId
              setContextMenu({ visible: false, x: 0, y: 0 })
              if (!id) return
              try {
                const res = await fetch(`/api/utility/messages/${id}`, { method: 'DELETE', credentials: 'include' })
                if (!res.ok) throw new Error('delete failed')
                setAllMessages(prev => prev.filter(mm => String(mm.message_id) !== String(id)))
              } catch (e) { console.warn('Failed to delete message', e) }
            }}>Delete message</button>
          </div>, document.body
        )}
      </div>
      <div className="chat-window-compose">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value.replace(/\r?\n/g, ' '))}
          onKeyDown={e => {
            // Prevent inserting newlines — Enter sends the message
            if (e.key === 'Enter') {
              e.preventDefault()
              void send()
            }
          }}
          onPaste={e => {
            // sanitize pasted text by removing newlines
            const clipboard = (e.clipboardData || (window as any).clipboardData)
            const text = clipboard ? clipboard.getData('text') : ''
            if (text && /\r|\n/.test(text)) {
              e.preventDefault()
              const sanitized = text.replace(/\r?\n+/g, ' ')
              // insert sanitized text at cursor
              const ta = e.target as HTMLTextAreaElement
              const start = ta.selectionStart || 0
              const end = ta.selectionEnd || 0
              const newVal = ta.value.slice(0, start) + sanitized + ta.value.slice(end)
              setBody(newVal)
              // move caret after inserted text
              requestAnimationFrame(() => {
                try { ta.selectionStart = ta.selectionEnd = start + sanitized.length } catch (err) {}
              })
            }
          }}
          placeholder="Type a message"
        />
        <div className="compose-actions">
          <button onClick={send} className="btn primary">Send</button>
        </div>
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const { socket, presence } = useSocket()
  const { user, session } = useSession()
  // open by default if a user is already logged in; otherwise closed.
  const [open, setOpen] = useState<boolean>(() => Boolean(user))
  const [partners, setPartners] = useState<Partner[]>([])
  const [unreadMap, setUnreadMap] = useState<Record<number, boolean>>({})
  const [userMap, setUserMap] = useState<Record<number, { first_name: string, last_name: string, role?: string }>>({})
  const [activePartner, setActivePartner] = useState<number | null>(null)
  const [showUserFinder, setShowUserFinder] = useState(false)
  const [animating, setAnimating] = useState(false)
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const posRef = useRef({ x: 20, y: 140 })
  const dragging = useRef(false)
  const wasDragged = useRef(false)
  const capturedElRef = useRef<HTMLElement | null>(null)
  const movedOnce = useRef(false)

  useEffect(() => {
    const el = widgetRef.current
    if (!el) return

    function findScrollable(elm: HTMLElement | null) : HTMLElement | null {
      let cur: HTMLElement | null = elm
      while (cur && cur !== el) {
        const style = window.getComputedStyle(cur)
        const overflowY = style.overflowY
        const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight
        if (canScroll) return cur
        cur = cur.parentElement
      }
      const body = (el as HTMLElement).querySelector('.chat-window-body, .userfinder-results') as HTMLElement | null
      if (body && body.scrollHeight > body.clientHeight) return body
      return null
    }

    function onDocWheel(e: WheelEvent) {
      try {
  const rect = (el as HTMLElement).getBoundingClientRect()
        if (!(e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom)) return
        const target = e.target as HTMLElement | null
        const scrollable = findScrollable(target)
        const delta = e.deltaY
        if (!scrollable) {
          e.preventDefault(); e.stopPropagation(); return
        }
        const atTop = scrollable.scrollTop <= 0
        const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1
        if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
          e.preventDefault(); e.stopPropagation(); return
        }
      } catch (err) {
        try { e.preventDefault(); e.stopPropagation() } catch (err) {}
      }
    }

    document.addEventListener('wheel', onDocWheel as EventListener, { passive: false })

    return () => {
      document.removeEventListener('wheel', onDocWheel as EventListener)
    }
  }, [])

  useEffect(() => {
    // load partners only for logged-in users
    if (!user) {
      setPartners([])
      return
    }
    (async () => {
      try {
        const res = await fetch('/api/utility/messages/partners', { credentials: 'include' })
        if (!res.ok) {
          console.warn('[ChatWidget] partners fetch not ok', res.status)
          setPartners([])
          return
        }
        const json = await res.json()
        // normalize backend response: it may return an array of numbers or array of { other_id, last_at }
        let parsedPartners: Partner[] = []
        if (!Array.isArray(json)) {
          console.warn('[ChatWidget] partners fetch returned non-array:', json)
          parsedPartners = []
        } else if (json.length === 0) {
          // no partners/conversations found
          parsedPartners = []
        } else if (typeof json[0] === 'number') {
          parsedPartners = (json as number[]).map(n => ({ other_id: Number(n) }))
        } else {
          parsedPartners = (json as any[]).map(o => ({ other_id: Number(o.other_id), last_at: o.last_at ? String(o.last_at) : undefined }))
        }
        setPartners(parsedPartners)
        // If the logged-in user is an admin or mentor, attempt to fetch missing
        // user details (name) for partners that are not present in the reduced list.
        // We use the existing documented endpoint GET /api/users/check/:user_id which
        // is accessible to admins and mentors.
        try {
          const requesterRole = (session && (session.role || session.user_role)) || (user && (user.role || user.user_role)) || null
            if (requesterRole === 'admin' || requesterRole === 'mentor') {
            // build list of partner ids that are missing from userMap
            const toFetch: number[] = []
            for (const p of parsedPartners) {
              if (!p) continue
              if (!p.other_id) continue
              if (!((userMap || {})[p.other_id])) toFetch.push(Number(p.other_id))
            }
            if (toFetch.length > 0) {
              await Promise.all(toFetch.map(async id => {
                try {
                  const r = await fetch(`/api/users/check/${id}`, { credentials: 'include' })
                  if (!r.ok) return
                  const u = await r.json()
                  if (u && u.first_name) {
                    setUserMap(prev => ({ ...(prev || {}), [Number(id)]: { first_name: u.first_name, last_name: u.last_name, role: u.role } }))
                  }
                } catch (e) {
                  // ignore per-user errors
                }
              }))
            }
          }
        } catch (e) {
          // ignore enrichment errors
        }

        // attempt to enrich partners with last_at if backend didn't provide it
        try {
          if (parsedPartners.length > 0 && parsedPartners.length <= 40) {
            const needs = parsedPartners.filter(p => !p.last_at)
            await Promise.all(needs.map(async p => {
              try {
                const r = await fetch(`/api/utility/messages/${p.other_id}`, { credentials: 'include' })
                if (!r.ok) {
                  // mark as attempted
                  p._loaded_last_at = true
                  return
                }
                const msgs = await r.json()
                if (Array.isArray(msgs) && msgs.length > 0) {
                  const last = msgs[msgs.length - 1]
                  p.last_at = last.sent_at
                }
              } catch (e) {
                // ignore per-partner errors
              }
              p._loaded_last_at = true
            }))
            // update state with enriched data
            setPartners(parsedPartners.map(x => ({ ...x })))
          }
        } catch (e) {
          // ignore enrichment errors
        }
      } catch (e) {
        console.error('[ChatWidget] failed to load partners', e)
      }
    })()
  }, [user])

  // load reduced users map so we can show full names in DM header
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/users/reduced', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then((list: any[] | null) => {
      if (cancelled || !list) return
      const m: Record<number, { first_name: string, last_name: string, role?: string }> = {}
      for (const u of list) m[Number(u.user_id)] = { first_name: u.first_name, last_name: u.last_name, role: u.role }
      setUserMap(m)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!socket) return
    function onReceive(payload: any) {
      // if partner list doesn't include this user, refresh partners
      const other = payload.sender_id === user?.user_id ? payload.receiver_id : payload.sender_id
      const found = partners.find(p => p.other_id === other)
      if (!found) {
        // reload partners and normalize like above
        fetch('/api/utility/messages/partners', { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .then((j: any) => {
            if (!j) return
            if (Array.isArray(j) && j.length > 0 && typeof j[0] === 'number') {
              setPartners((j as number[]).map(n => ({ other_id: Number(n) })))
            } else if (Array.isArray(j)) {
              setPartners((j as any[]).map(o => ({ other_id: Number(o.other_id), last_at: o.last_at ? String(o.last_at) : undefined })))
            }
          }).catch(() => {})
      }
        // mark unread if message is from someone else to me and I'm not currently viewing that dm
        try {
          const partnerId = payload.sender_id === user?.user_id ? payload.receiver_id : payload.sender_id
          // only mark unread when sender is not me and not the active partner
          if (payload.sender_id !== user?.user_id && partnerId !== activePartner) {
            setUnreadMap(prev => ({ ...prev, [partnerId]: true }))
          }
        } catch (e) {}
    }
    socket.on('receive_message', onReceive)
    return () => { socket.off('receive_message', onReceive) }
  }, [socket, partners, user?.user_id, activePartner])

  function formatZagreb(iso: string) {
    try {
      const d = new Date(iso)
      // Use Intl.DateTimeFormat for Europe/Zagreb
      const dt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Zagreb',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      })
      // dt formats like 31/10/2025, 14:23:45 — convert to dd.mm.yyyy HH:MM:SS
      const parts = dt.formatToParts(d)
      const map: any = {}
      for (const p of parts) map[p.type] = p.value
      const formatted = `${map.day}.${map.month}.${map.year}. ${map.hour}:${map.minute}:${map.second}`
      return `Last message at ${formatted}`
    } catch (e) {
      return `Last message at ${iso}`
    }
  }

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
    // if pointerdown started on an interactive control inside the header (buttons/links/inputs),
    // don't start dragging or capture the pointer so that the nested control receives the event
    try {
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.closest('button, a, input, textarea, select, .accent-btn, .uf-close') )) {
        return
      }
    } catch (err) {}
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
      style={ movedOnce.current ? { left: posRef.current.x + 'px', top: posRef.current.y + 'px', position: 'fixed', zIndex: 9999 } : { right: '20px', bottom: '140px', position: 'fixed', zIndex: 9999 } }
    >
      <div
        className="chat-widget-header"
        onClick={(e) => { if (wasDragged.current) { wasDragged.current = false; return } /* ignore clicks coming from nested interactive elements */ if ((e.target as HTMLElement) !== e.currentTarget) return; setOpen(s => !s) }}
        onPointerDown={handleHeaderPointerDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="header-unread-dot" aria-hidden={true} style={{ visibility: Object.keys(unreadMap).length ? 'visible' : 'hidden' }} />
          <strong>Chat</strong>
          <span className="chat-badge">{partners.length}</span>
        </div>
        <div style={{ marginLeft: 8 }}>
          <button className="accent-btn small" onClick={(e) => { e.stopPropagation(); setShowUserFinder(true) }}>New chat</button>
        </div>
        <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`chat-chevron ${open ? 'open' : ''}`} style={{ fontSize: 12, color: 'var(--muted)', transition: 'transform .3s ease' }}>{open ? '▾' : '▸'}</div>
        </div>
      </div>
      <div className={`chat-widget-body ${open ? 'open' : 'closed'}`}>
          <div className={`chat-content ${activePartner ? 'chat-active' : 'chat-history'} ${animating ? 'anim' : ''}`}>
            {activePartner ? (
              <ChatWindowInline partnerId={activePartner} onClose={() => setActivePartner(null)} partnerName={
                userMap[activePartner]
                  ? `${userMap[activePartner].first_name} ${userMap[activePartner].last_name}${(userMap[activePartner].role === 'admin' && (session?.role === 'admin' || session?.role === 'mentor' || user?.role === 'admin' || user?.role === 'mentor') ? ' (admin)' : '')}`
                  : undefined
              } onMessageSent={(id, sent_at) => {
                setPartners(prev => {
                  const found = prev.find(p => p.other_id === id)
                  if (found) {
                    return prev.map(p => p.other_id === id ? { ...p, last_at: sent_at, _loaded_last_at: true } : p)
                  }
                  return [{ other_id: id, last_at: sent_at, _loaded_last_at: true }, ...prev]
                })
              }} />
            ) : (
              partners.length === 0 ? (
                <div className="partners-empty full-width">
                  <div className="empty-text">No conversations yet.</div>
                  <button className="accent-btn" onClick={(e) => { e.stopPropagation(); setShowUserFinder(true) }}><span className="accent-btn-text">New chat</span></button>
                </div>
              ) : (
                <div className="chat-partners">
                  {partners.map(p => (
                    <div key={p.other_id} className="partner-row" onClick={() => { setActivePartner(p.other_id); setOpen(true); setAnimating(true); setTimeout(() => setAnimating(false), 320); setUnreadMap(prev=>{ const c = {...prev}; delete c[p.other_id]; return c }) }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {unreadMap[p.other_id] && <span className="partner-unread-dot" aria-hidden />}
                        <div>
                          <div className="partner-name">
                            {userMap[p.other_id]
                              ? `${userMap[p.other_id].first_name} ${userMap[p.other_id].last_name}${(userMap[p.other_id].role === 'admin' ? ' (admin)' : '')}`
                              : `User with id ${p.other_id} (admin)`
                            }
                          </div>
                          {presence && presence[Number(p.other_id)] && (
                            <div style={{ color: 'var(--success)', fontSize: '0.72rem', marginTop: 2, fontWeight: 700 }}>ONLINE</div>
                          )}
                        </div>
                      </div>
                      <div className="partner-last muted">{p.last_at ? formatZagreb(p.last_at) : (p._loaded_last_at ? 'No messages' : 'Loading...')}</div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
      <UserFinder open={showUserFinder} onClose={() => setShowUserFinder(false)} onSelect={(id) => { setActivePartner(id); setShowUserFinder(false); setOpen(true) }} />
      </div>
    </div>
  )
}
