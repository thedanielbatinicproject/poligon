import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import AuthModal from './AuthModal';
import ThemeToggle from './ThemeToggle';
import { useSession } from '../lib/session';

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

  return (
    <>
      <header className="site-header">
        <div className="site-title">Poligon</div>

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
            <span className="nav-link-label">Home</span>
          </NavLink>

          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
            <span className="nav-link-label">Profile</span>
          </NavLink>

          <NavLink to="/documents" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
            <span className="nav-link-label">Documents</span>
          </NavLink>

          <NavLink to="/tasks" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
            <span className="nav-link-label">Tasks</span>
          </NavLink>

          <NavLink to="/mentor" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
            <span className="nav-link-label">Mentor</span>
          </NavLink>

          <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}>
            <span className="nav-link-label">Admin</span>
          </NavLink>

          {/* Right side: auth controls */}
          <div className="header-actions">
            <ThemeToggle />
            {user ? (
              <>
                <div className="auth-username">{user.first_name || user.firstName || user.name}</div>
                <button onClick={() => session?.logout()} className="btn btn-logout btn-sm auth-btn">
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