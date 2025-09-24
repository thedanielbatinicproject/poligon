import React, { useState } from 'react';

function Home() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        status: 'error',
        message: 'Nije moguće povezati se s poslužiteljem.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="hero">
      <div className="container">
        <h2>Dobrodošli na Poligon</h2>
        <p>Ova stranica je stvorena kao početni predložak za Node.js web aplikaciju s React.js frontend-om.</p>
        
        <button 
          className="btn" 
          onClick={checkStatus}
          disabled={loading}
        >
          {loading ? 'Provjeravam...' : 'Provjeri status poslužitelja'}
        </button>
        
        {status && (
          <div className={`status-result ${status.status === 'success' ? 'success' : 'error'}`}>
            <h4>Status: {status.status}</h4>
            <p>Poruka: {status.message}</p>
            {status.timestamp && (
              <p>Vrijeme: {new Date(status.timestamp).toLocaleString()}</p>
            )}
            {status.framework && (
              <p>Frontend: {status.framework}</p>
            )}
            {status.backend && (
              <p>Backend: {status.backend}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Home;