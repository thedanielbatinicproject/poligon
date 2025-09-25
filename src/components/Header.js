import React from 'react';

function Header({ user, mode, onToggleMode, onLogout }) {
  return (
    <header className="header">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="logo">
              <span className="logo-icon">📄</span>
              <span className="logo-text">Poligon</span>
            </div>
          </div>

          <div className="nav-content">
            {user && (
              <div className="mode-controls">
                <span className="mode-label">Mode:</span>
                <div className="mode-toggle">
                  <button 
                    className={`mode-btn ${mode === 'VIEW' ? 'active' : ''}`}
                    onClick={onToggleMode}
                    disabled={mode === 'VIEW'}
                  >
                    VIEW
                  </button>
                  <button 
                    className={`mode-btn ${mode === 'EDIT' ? 'active' : ''}`}
                    onClick={onToggleMode}
                    disabled={mode === 'EDIT'}
                  >
                    EDIT
                  </button>
                </div>
              </div>
            )}

            <div className="nav-actions">
              {user ? (
                <div className="user-menu">
                  <span className="user-greeting">
                    Pozdrav, {user.username}
                  </span>
                  <button 
                    className="logout-btn"
                    onClick={onLogout}
                  >
                    Odjava
                  </button>
                </div>
              ) : (
                <div className="guest-info">
                  <span className="guest-mode">VIEW režim</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;