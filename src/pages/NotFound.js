import React from 'react';

function NotFound({ setCurrentPage }) {
  return (
    <section className="error-page">
      <div className="container">
        <h2>404 - Stranica nije pronađena</h2>
        <p>Žao nam je, stranica koju tražite ne postoji.</p>
        <button 
          className="btn" 
          onClick={() => setCurrentPage('home')}
        >
          Povratak na početnu
        </button>
      </div>
    </section>
  );
}

export default NotFound;