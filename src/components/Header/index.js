import React from 'react';
import './header.css';

function Header({ currentPage, onPageChange, user, isAuthenticated, onLogout }) {
  return (
    <header>
      <nav>
        <div className="nav-container">
          <h1>
            <a href="#" onClick={(e) => { e.preventDefault(); onPageChange('home'); }}>
              <span className="logo-wrap">
                <img src="/favicon.png" alt="logo" className="logo" />
              </span>
              POLIGON
            </a>
          </h1>
          <ul className="nav-menu">
            <li>
              <a 
                href="#" 
                className={currentPage === 'home' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); onPageChange('home'); }}
              >
                Početna
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className={currentPage === 'documents' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); onPageChange('documents'); }}
              >
                Dokumenti
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className={currentPage === 'tasks-todos' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); onPageChange('tasks-todos'); }}
              >
                Zadatci
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className={currentPage === 'about' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); onPageChange('about'); }}
              >
                O platformi
              </a>
            </li>
          </ul>
          <div className="auth-section">
            {user && user.role === 'admin' && (
              <button 
                className={`admin-panel-btn ${currentPage === 'admin' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); onPageChange('admin'); }}
              >
                ADMIN PANEL
              </button>
            )}
            {user ? (
              <div className="user-info">
                <span>{user.first_name && user.last_name ? `Pozdrav, ${user.first_name} ${user.last_name}!` : <em>unknown name!</em>}</span>
                <button onClick={onLogout} className="logout-btn">
                  Odjavi se
                </button>
              </div>
            ) : (
              <button 
                onClick={() => onPageChange('login')}
                className="login-btn"
              >
                Prijavi se
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;
