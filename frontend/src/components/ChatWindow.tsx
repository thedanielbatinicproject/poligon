import React, { useEffect, useRef, useState } from 'react'
import { useSocket } from './SocketProvider'
import { useSession } from '../lib/session'

type Msg = {
  message_id?: number | string
  sender_id: number
  receiver_id: number
  message_content: string
  sent_at: string
  status?: 'sending' | 'sent' | 'error'
}

export default function ChatWindow({ partnerId, onClose }: { partnerId: number, onClose: () => void }) {
  const { socket } = useSocket()
  const { user } = useSession()
  const [allMessages, setAllMessages] = useState<Msg[]>([])
  const [displayCount, setDisplayCount] = useState(50)
  const [body, setBody] = useState('')
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
  const res = await fetch(`/api/utility/messages/${partnerId}`, { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        // ensure messages are sorted ascending by date
        json.sort((a: Msg, b: Msg) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
        setAllMessages(json)
        // scroll to bottom after small delay
        setTimeout(() => { scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight) }, 50)
      } catch (e) {}
    }
    load()
    return () => { cancelled = true }
  }, [partnerId])

  useEffect(() => {
    if (!socket) return
    function onReceive(payload: any) {
      // payload expected: { sender_id, receiver_id, message_content, sent_at, message_id }
      const other = payload.sender_id === user?.user_id ? payload.receiver_id : payload.sender_id
      if (other !== partnerId) return
      setAllMessages(prev => [...prev, payload])
      // scroll to bottom when new message arrives
      setTimeout(() => { scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight) }, 20)
    }
    socket.on('receive_message', onReceive)
    return () => { socket.off('receive_message', onReceive) }
  }, [socket, partnerId, user?.user_id])

  const visible = allMessages.slice(Math.max(0, allMessages.length - displayCount))

  function loadMore() {
    setDisplayCount(c => Math.min(allMessages.length, c + 50))
  }

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
      // replace temp message with server message id if provided
      setAllMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, message_id: json.message_id ?? m.message_id, status: 'sent' } : m))
    } catch (e) {
      setAllMessages(prev => prev.map(m => m.message_id === tempId ? { ...m, status: 'error' } : m))
    }
    // scroll to bottom
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
