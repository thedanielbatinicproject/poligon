import React, { useEffect } from 'react'
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import { getPoligonCookie } from '../lib/cookies'
import { useSession } from '../lib/session'
import Home from '../pages/Home'

// Allowed top-level routes to redirect into (avoid open redirect risks)
const ALLOWED_PREFIXES = ['/', '/home', '/profile', '/documents', '/tasks', '/mentor', '/admin', '/playground']

function isAllowedRoute(path: string) {
  if (!path || typeof path !== 'string') return false
  try {
    const u = new URL(path, window.location.origin)
    const p = u.pathname || '/'
    return ALLOWED_PREFIXES.some(a => p === a || p.startsWith(a + '/'))
  } catch {
    return ALLOWED_PREFIXES.some(a => path === a || path.startsWith(a + '/'))
  }
}

/**
 * RedirectToLastRoute
 * - When mounted at `/` on an initial (POP) navigation, attempts to redirect
 *   the user to the session-stored last_route (server session preferred,
 *   cookie fallback). If no redirect is performed, renders the Home page.
 */
export default function RedirectToLastRoute(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  const sessionCtx = (() => { try { return useSession() } catch { return null } })()

  useEffect(() => {
    // Only consider redirect when we're exactly at root
    if (location.pathname !== '/') return

    // Only redirect on initial/back/enter navigations (POP).
    // Clicking menu "Home" creates a PUSH navigation and will not be redirected.
    if (navType !== 'POP') return

    // Wait for session load if SessionProvider is still loading
    if (sessionCtx?.loading) return

    // Prefer server-backed session
    let target: string | null = null
    const s = sessionCtx?.session
    if (s && s.last_route) target = String(s.last_route)
    else {
      const cookie = getPoligonCookie()
      if (cookie && cookie.session && cookie.session.last_route) target = String(cookie.session.last_route)
      else if (cookie && cookie.last_route) target = String(cookie.last_route)
    }

    if (!target) return

    // Normalize pathname only
    try {
      const parsed = new URL(target, window.location.origin)
      target = parsed.pathname + (parsed.search || '') + (parsed.hash || '')
    } catch (e) {
      // leave as-is
    }

    if (!isAllowedRoute(target)) return
    if (location.pathname === target || location.pathname.startsWith(target + '/')) return

    // If target is protected, ensure user is authenticated
    const protectedPrefixes = ['/profile', '/documents', '/tasks', '/mentor', '/admin']
    const isProtected = protectedPrefixes.some(p => target === p || target.startsWith(p + '/'))
    const isAuthenticated = !!sessionCtx?.user
    if (isProtected && !isAuthenticated) return

    navigate(target, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navType, sessionCtx?.session, sessionCtx?.loading, sessionCtx?.user])

  // If no redirect was triggered, render Home so the root route still shows content
  return <Home />
}
