import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from '../lib/session'

type SocketContextShape = {
  socket: Socket | null
  // presence map: user id -> online boolean
  presence: Record<number, boolean>
}

// Provide a default value so components can safely call useSocket() even if the
// provider isn't mounted (this makes the ChatWidget resilient during testing).
const SocketContext = createContext<SocketContextShape>({ socket: null, presence: {} })

export function useSocket() {
  // Return the context directly; it will contain { socket: null } by default
  // rather than throwing. This keeps components simpler and avoids crashes
  // if SocketProvider isn't mounted for any reason.
  return useContext(SocketContext)
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [presence, setPresence] = useState<Record<number, boolean>>({})

  useEffect(() => {
    // connect when user is available
    if (!user) return
    const s = io(undefined as any, { // connect to same origin
      path: '/socket.io',
      // Try WebSocket first, fallback to HTTP long polling if blocked
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })
    setSocket(s)

    function onConnect() {
      // register the user id on the server so server can join room
      try {
        // send primitive id (server expects a room name string/number)
        s.emit('register_user', user.user_id)
      } catch (e) {}
    }

    s.on('connect', onConnect)

    // Listen for presence updates from the server and maintain a small map
    function onPresenceUpdate(payload: any) {
      try {
        const uid = payload && (payload.user_id || payload.userId || payload.id)
        if (!uid) return
        const online = Boolean(payload.online)
        setPresence(prev => ({ ...(prev || {}), [Number(uid)]: online }))
      } catch (e) {}
    }

    function onPresenceInit(payload: any) {
      try {
        const online: any[] = (payload && payload.online) || []
        const map: Record<number, boolean> = {}
        for (const id of online) map[Number(id)] = true
        setPresence(map)
      } catch (e) {}
    }

    s.on('user:presence:update', onPresenceUpdate)
    s.on('presence_init', onPresenceInit)

    return () => {
      s.off('connect', onConnect)
      s.off('user:presence:update', onPresenceUpdate)
      s.off('presence_init', onPresenceInit)
      try { s.disconnect() } catch (e) {}
      setSocket(null)
      setPresence({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id])

  const value = useMemo(() => ({ socket, presence }), [socket, presence])
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export default SocketProvider
