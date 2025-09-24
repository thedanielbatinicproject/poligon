import React from 'react';

function Header({ currentPage, setCurrentPage }) {
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
                className={currentPage === 'about' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }}
              >
                O nama
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

export default Header;