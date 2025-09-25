import React from 'react';

function Header({ currentPage, setCurrentPage, user, onLogout }) {
  return (
    <header>
      <nav>
        <div className="nav-container">
          <h1>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('home'); }}>
              Poligon
            </a>
          </h1>
          <ul className="nav-menu">
            <li>
              <a 
                href="#" 
                className={currentPage === 'home' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); setCurrentPage('home'); }}
              >
                Početna
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className={currentPage === 'documents' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); setCurrentPage('documents'); }}
              >
                Dokumenti
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className={currentPage === 'about' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }}
              >
                O nama
              </a>
            </li>
          </ul>
          <div className="auth-section">
            {user ? (
              <div className="user-info">
                <span>Pozdrav, {user.username}!</span>
                <button onClick={onLogout} className="logout-btn">
                  Odjavi se
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentPage('login')}
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