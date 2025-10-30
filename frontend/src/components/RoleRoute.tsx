import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useNotifications } from '../lib/notifications'

function extractRole(user: any): string | null {
  if (!user) return null
  return (user.role || user.user?.role || user.data?.role || null) as string | null
}

type RoleRouteProps = {
  element: JSX.Element
  allowedRoles?: string[] // if omitted, only requires authenticated user
}

export default function RoleRoute({ element, allowedRoles }: RoleRouteProps) {
  const session = (() => {
    try {
      return useSession()
    } catch (e) {
      return null
    }
  })()
  const user = session?.user
  const loading = session?.loading
  const role = extractRole(user)
  const { push } = useNotifications()

  useEffect(() => {
    // Do not run checks while session is loading (initial fetch).
    if (loading) return

    // If not authenticated, notify the user once and redirect to home.
    if (!user) {
      try { push('You must be logged in to view this page.', undefined, true) } catch (e) {}
      return
    }

    // If user is authenticated but role is not permitted, notify with clear message.
    if (allowedRoles && role && !allowedRoles.includes(role)) {
      const admin = import.meta.env?.VITE_ADMIN_MAIL ? ("the system administrator at " + import.meta.env?.VITE_ADMIN_MAIL) : 'your system administrator'
      try {
        push(`Your role (${role}) does not permit access to this page. If you believe this is an error, please contact ${admin}.`, undefined, true)
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, allowedRoles, loading])

  // If still loading session, render nothing (or a loader if desired).
  if (loading) return null

  // Redirect if not allowed. Notification is posted via effect above.
  if (!user) return <Navigate to="/" replace />
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />

  return element
}
