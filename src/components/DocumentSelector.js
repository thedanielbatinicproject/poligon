import React, { useState, useEffect } from 'react';
import { thesesAPI } from '../utils/api';
import './DocumentSelector.css';

const DocumentSelector = ({ user, onDocumentSelect, onCreateNew }) => {
    const [theses, setTheses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTheses();
    }, []);

    const loadTheses = async () => {
        try {
            setLoading(true);
            
            const result = await thesesAPI.getAll();
            
            if (result.success) {
                setTheses(result.data);
            } else {
                setError('Greška pri učitavanju dokumenata');
            }
        } catch (error) {
            console.error('Error loading theses:', error);
            setError('Greška pri učitavanju dokumenata');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (thesis) => {
        // Spremimo odabrani dokument u localStorage
        localStorage.setItem('selectedDocumentId', thesis.id);
        onDocumentSelect(thesis);
    };

    if (loading) {
        return (
            <div className="document-selector">
                <div className="selector-header">
                    <h2>Odaberi dokument</h2>
                </div>
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Učitavam dokumente...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="document-selector">
                <div className="selector-header">
                    <h2>Odaberi dokument</h2>
                </div>
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={loadTheses} className="retry-btn">
                        Pokušaj ponovno
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="document-selector">
            <div className="selector-header">
                <h2>Odaberi dokument</h2>
                <p>Odaberite diplomski rad koji želite pregledati ili uređivati</p>
            </div>

            <div className="document-actions">
                {user && (
                    <button 
                        onClick={onCreateNew}
                        className="create-new-btn"
                    >
                        <span className="btn-icon">+</span>
                        Kreiraj novi dokument
                    </button>
                )}
            </div>

            <div className="documents-list">
                {theses.length === 0 ? (
                    <div className="no-documents">
                        <p>Nema dostupnih dokumenata</p>
                        {user && (
                            <button 
                                onClick={onCreateNew}
                                className="create-first-btn"
                            >
                                Kreiraj prvi dokument
                            </button>
                        )}
                    </div>
                ) : (
                    theses.map(thesis => (
                        <div
                            key={thesis.id}
                            className="document-item"
                            onClick={() => handleSelect(thesis)}
                        >
                            <div className="document-info">
                                <h3 className="document-title">
                                    {thesis.metadata?.title || 'Untitled Document'}
                                </h3>
                                <div className="document-meta">
                                    <span className="document-author">
                                        {thesis.metadata?.author || 'Nepoznat autor'}
                                    </span>
                                    <span className="document-date">
                                        {new Date(thesis.updated).toLocaleDateString('hr-HR')}
                                    </span>
                                </div>
                                <div className="document-stats">
                                    <span className="chapter-count">
                                        {thesis.chapters?.length || 0} poglavlja
                                    </span>
                                    <span className="word-count">
                                        {thesis.stats?.totalWords || 0} riječi
                                    </span>
                                </div>
                            </div>
                            <div className="document-actions-mini">
                                <span className="select-indicator">Odaberi →</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DocumentSelector;