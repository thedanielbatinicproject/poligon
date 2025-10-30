import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import AuthModal from './AuthModal';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../lib/theme'
import PoligonLogo from '../assets/images/PoligonLogoNoText.png'
import PoligonLogoWhite from '../assets/images/PoligonLogoNoTextWhite.png'
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';

const linkBase: React.CSSProperties = {
  textDecoration: 'none',
  color: 'var(--text)',
  padding: '6px 10px',
  borderRadius: 6,
  display: 'inline-block',
  border: '1px solid transparent',
};

const linkActive: React.CSSProperties = {
  backgroundColor: 'var(--accent)',
  color: 'var(--heading-2)',
  fontWeight: 600,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--panel)',
  color: 'var(--text)'
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

export default function Header(): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false)
  const session = (() => {
    try {
      return useSession()
    } catch (e) {
      return null
    }
  })()

  const user = session?.user
  const { push } = useNotifications()
  const { theme } = useTheme()

  function extractRole(u: any): string | null {
    if (!u) return null
    return (u.role || u.user?.role || u.data?.role || null) as string | null
  }

  // normalize user shape: some APIs return { user: { ... } } while older code
  // used the full body. Prefer the inner user object when available.
  const displayUser = (user && (user.user ? user.user : user))
  const role = extractRole(displayUser)
  const isLoggedIn = !!displayUser
  
  const getHeaderName = (u: any) => {
    if (!u) return ''
    // prefer explicit display_name, then first+last, then email
    const dn = (u.display_name || '').toString().trim()
    if (dn) return dn
    const fn = (u.first_name || '').toString().trim()
    const ln = (u.last_name || '').toString().trim()
    const combined = `${fn} ${ln}`.trim()
    if (combined) return combined
    return (u.email || '').toString()
  }

  return (
    <>
      <header className="site-header">
        <div className="site-title">
          {isLoggedIn && role && (
            <div className="site-role">Role: {String(role).toUpperCase()}</div>
          )}
          <img src={theme === 'dark' ? PoligonLogoWhite : PoligonLogo} alt="Poligon" className="site-logo" />
          <span className="site-title-text">Poligon</span>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
            <span className="nav-link-label">Home</span>
          </NavLink>

          {isLoggedIn && (
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              <span className="nav-link-label">Profile</span>
            </NavLink>
          )}

          {isLoggedIn && (
            <NavLink to="/documents" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              <span className="nav-link-label">Documents</span>
            </NavLink>
          )}

          {isLoggedIn && (
            <NavLink to="/tasks" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              <span className="nav-link-label">Tasks</span>
            </NavLink>
          )}

          {(role === 'mentor' || role === 'admin') && (
            <NavLink to="/mentor" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              <span className="nav-link-label">Mentor</span>
            </NavLink>
          )}

          {role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
              <span className="nav-link-label">Admin</span>
            </NavLink>
          )}

          {/* Right side: auth controls */}
          <div className="header-actions">
            <ThemeToggle />
            {user ? (
              <>
                <div className="auth-username">{`Welcome, ${getHeaderName(displayUser)}!`}</div>
                <button
                  onClick={async () => {
                    try {
                      await session?.logout()
                      try { push('Logged out successfully!') } catch (e) {}
                    } catch (e: any) {
                      try { push(e?.message || 'Logout failed! Please try again!', undefined, true) } catch (ee) {}
                    }
                  }}
                  className="btn btn-logout btn-sm auth-btn"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm auth-btn">
                  Login / Register
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}