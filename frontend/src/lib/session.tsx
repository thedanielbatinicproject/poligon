import React, { createContext, useContext, useEffect, useState } from 'react'
import api, { apiFetch } from './api'
import { setPoligonCookie, removePoligonCookie } from './cookies'

type User = any | null

type SessionContextShape = {
  user: User
  loading: boolean
  refresh: () => Promise<void>
  loginLocal: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  registerLocal: (payload: { email: string; first_name: string; last_name: string }) => Promise<any>
  openAaiPopup: () => Promise<void>
}

const SessionContext = createContext<SessionContextShape | undefined>(undefined)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      // prefer high-level api.status if available
      const body = await (api.status ? api.status() : apiFetch('/api/status', { method: 'GET' }))
      // assume backend returns an object representing the session/user
      setUser(body)
      setPoligonCookie(body)
    } catch (err: any) {
      setUser(null)
      removePoligonCookie()
    } finally {
      setLoading(false)
    }
  }

  async function loginLocal(email: string, password: string) {
    const body = await (api.loginLocal ? api.loginLocal({ email, password }) : apiFetch('/api/auth/login-local', { method: 'POST', body: JSON.stringify({ email, password }) }))
    // after login, call refresh to pick up session and cookie
    await refresh()
    return body
  }

  async function logout() {
    try {
  if (api.logout) await api.logout(); else await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // ignore
    }
    setUser(null)
    removePoligonCookie()
  }

  async function registerLocal(payload: { email: string; first_name: string; last_name: string }) {
    // backend will send email with password; do not auto-login
  const body = await apiFetch('/api/users/register-local', { method: 'POST', body: JSON.stringify(payload) })
    return body
  }

  // open AAIedu login in a popup and poll for status
  async function openAaiPopup() {
    const popup = window.open('/api/auth/aaiedu', 'aaiedu_login', 'width=800,height=700')
    if (!popup) throw new Error('Popup blocked')

    // poll status every second for up to 60s
    const max = 60
    let attempts = 0
    return new Promise<void>((resolve, reject) => {
      const tid = setInterval(async () => {
        attempts += 1
        try {
          const body = await (api.status ? api.status() : apiFetch('/api/status', { method: 'GET' }))
          if (body) {
            setUser(body)
            setPoligonCookie(body)
            clearInterval(tid)
            try {
              popup.close()
            } catch (e) {
              // ignore
            }
            resolve()
          }
        } catch (e) {
          // not logged in yet
        }
        if (attempts >= max) {
          clearInterval(tid)
          try {
            popup.close()
          } catch (e) {}
          reject(new Error('AAI login timed out'))
        }
      }, 1000)
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SessionContext.Provider value={{ user, loading, refresh, loginLocal, logout, registerLocal, openAaiPopup }}>
      {children}
    </SessionContext.Provider>
  )
}
