import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import api, { apiFetch, postJSON } from './api'
import { setPoligonCookie, removePoligonCookie } from './cookies'
import { useLocation } from 'react-router-dom'

type User = any | null
type SessionObj = any | null

type SessionContextShape = {
  user: User
  session: SessionObj
  loading: boolean
  refresh: () => Promise<void>
  patchSession: (attrs: Record<string, any>) => Promise<void>
  loginLocal: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  registerLocal: (payload: { email: string; first_name: string; last_name: string }) => Promise<any>
  openAaiPopup: () => Promise<void>
}

const SessionContext = createContext<SessionContextShape | undefined>(undefined)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('SESSION ERROR: useSession must be used inside SessionProvider')
  return ctx
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null)
  const [session, setSession] = useState<SessionObj>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const routeTimer = useRef<number | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      // prefer high-level api.status if available
      // But avoid using the shared api.getJSON / postJSON helpers here because they
      // trigger the global notifier when the server responds 401 (unauthenticated).
      // On public pages we expect 401 frequently during initial load and should
      // not surface a notification to the user. Use a targeted fetch and only
      // show notifications for unexpected errors.
      let body: any = null
      try {
        const resp = await fetch('/api/status', { method: 'GET', credentials: 'include' })
        if (resp.status === 401) {
          // Not authenticated - silently treat as anonymous and return
          setSession(null)
          setUser(null)
          setPoligonCookie(null)
          setLoading(false)
          return
        }
        // for other statuses let the normal flow parse JSON / fallback
        const text = await resp.text()
        try { body = JSON.parse(text) } catch { body = text }
        if (!resp.ok) throw new Error(`Status fetch failed: ${resp.status}`)
      } catch (err) {
        // network / unexpected error - rethrow to outer handler
        throw err
      }
      // modern API returns { session, user }
      if (body && typeof body === 'object' && ('session' in body || 'user' in body)) {
        setSession(body.session ?? null)
        setUser(body.user ?? null)
        setPoligonCookie(body)
        // if server provided a theme, notify ThemeProvider via a window event so it can react
        try {
          const theme = body.session && body.session.theme
          if (theme) {
            ;(window as any).__SERVER_THEME__ = theme
            window.dispatchEvent(new CustomEvent('server-theme', { detail: theme }))
          }
        } catch (e) {
          /* ignore */
        }
      } else {
        // fallback: older API returned the user directly
        setSession(null)
        setUser(body)
        setPoligonCookie(body)
      }
    } catch (err: any) {
      setUser(null)
      removePoligonCookie()
    } finally {
      setLoading(false)
    }
  }

  async function patchSession(attrs: Record<string, any>) {
    // only attempt when authenticated
    if (!user) return
    try {
      const body = await postJSON('/api/utility/session', attrs)
      // merge into local session state when successful
      setSession((s: any) => ({ ...(s || {}), ...(attrs || {}) }))
      // if theme was updated server-side, dispatch event so ThemeProvider can sync
      if (attrs && typeof attrs.theme !== 'undefined') {
        try {
          ;(window as any).__SERVER_THEME__ = attrs.theme
          window.dispatchEvent(new CustomEvent('server-theme', { detail: attrs.theme }))
        } catch (e) {}
      }
      return body
    } catch (e) {
      // errors are surfaced by postJSON which triggers global notifications
      throw e
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
            if (body && typeof body === 'object' && ('session' in body || 'user' in body)) {
              setSession(body.session ?? null)
              setUser(body.user ?? null)
              setPoligonCookie(body)
            } else {
              setUser(body)
              setPoligonCookie(body)
            }
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

  // Watch route changes and persist main routes to server (debounced)
  useEffect(() => {
    const allowed = ['/home', '/profile', '/documents', '/tasks', '/mentor', '/admin', '/playground', '/']
    const p = location.pathname || '/'
    const match = allowed.some((a) => p === a || p.startsWith(a + '/'))
    if (!match) return
    // debounce 800ms
    if (routeTimer.current) {
      window.clearTimeout(routeTimer.current)
      routeTimer.current = null
    }
    routeTimer.current = window.setTimeout(() => {
      try {
        // silently fire; postJSON surfaces errors globally
        patchSession({ last_route: p })
      } catch (e) {
        /* ignore here */
      }
    }, 800)
    return () => {
      if (routeTimer.current) {
        window.clearTimeout(routeTimer.current)
        routeTimer.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user])

  // Listen for theme changes from ThemeProvider and persist to server
  useEffect(() => {
    function onLocalTheme(e: any) {
      const t = e && e.detail ? e.detail : null
      if (!t) return
      // fire-and-forget; errors already surfaced by postJSON
      patchSession({ theme: t }).catch(() => {})
    }
    window.addEventListener('local-theme-changed', onLocalTheme as EventListener)
    return () => window.removeEventListener('local-theme-changed', onLocalTheme as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <SessionContext.Provider value={{ user, session, loading, refresh, patchSession, loginLocal, logout, registerLocal, openAaiPopup }}>
      {children}
    </SessionContext.Provider>
  )
}
