import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from '../lib/session'

type SocketContextShape = {
  socket: Socket | null
}

// Provide a default value so components can safely call useSocket() even if the
// provider isn't mounted (this makes the ChatWidget resilient during testing).
const SocketContext = createContext<SocketContextShape>({ socket: null })

export function useSocket() {
  // Return the context directly; it will contain { socket: null } by default
  // rather than throwing. This keeps components simpler and avoids crashes
  // if SocketProvider isn't mounted for any reason.
  return useContext(SocketContext)
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // connect when user is available
    if (!user) return
    const s = io(undefined as any, { // connect to same origin
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true
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

    return () => {
      s.off('connect', onConnect)
      try { s.disconnect() } catch (e) {}
      setSocket(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id])

  const value = useMemo(() => ({ socket }), [socket])
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export default SocketProvider
