import React, { useState, useEffect } from 'react';

function Dashboard({ user, mode }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, [mode]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status', {
        credentials: 'include'
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Diplomski rad builder</h1>
          <div className="status-info">
            <span className={`status-badge ${mode.toLowerCase()}`}>
              {mode} režim
            </span>
          </div>
        </div>

        <div className="dashboard-content">
          {mode === 'EDIT' ? (
            <div className="edit-mode">
              <h2>EDIT režim</h2>
              <p>U EDIT režimu možete:</p>
              <ul>
                <li>Kreirati nove dokumente</li>
                <li>Editirati postojeće sekcije</li>
                <li>Dodati slike i tablice</li>
                <li>Pratiti povijest promjena</li>
                <li>Upravljati verzijama</li>
              </ul>
              
              <div className="action-buttons">
                <button className="btn btn-primary">
                  Novi dokument
                </button>
                <button className="btn btn-secondary">
                  Upravljaj dokumentima
                </button>
              </div>
            </div>
          ) : (
            <div className="view-mode">
              <h2>VIEW režim</h2>
              <p>U VIEW režimu možete:</p>
              <ul>
                <li>Pregledavati postojeće dokumente</li>
                <li>Čitati sekcije</li>
                <li>Pregledavati slike i tablice</li>
                <li>Vidjeti povijest promjena</li>
                <li>Dodavati komentare</li>
              </ul>

              <div className="action-buttons">
                <button className="btn btn-outline">
                  Pregledaj dokumente
                </button>
                <button className="btn btn-outline">
                  Povijest promjena
                </button>
              </div>
            </div>
          )}

          {status && (
            <div className="status-section">
              <h3>Status sustava</h3>
              <div className="status-details">
                <p><strong>Status:</strong> {status.status}</p>
                <p><strong>Poruka:</strong> {status.message}</p>
                <p><strong>Vrijeme:</strong> {new Date(status.timestamp).toLocaleString('hr-HR')}</p>
                <p><strong>Autentificiran:</strong> {status.authenticated ? 'Da' : 'Ne'}</p>
                <p><strong>Trenutni režim:</strong> {status.mode}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;