import React, { useState, useEffect } from 'react';
import { thesesAPI } from '../../utils/api';
import './DocumentSelector.css';

const DocumentSelector = ({ user, onDocumentSelect, onCreateNew }) => {
    const [theses, setTheses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    
    const calculateTotalWords = (chapters) => {
        if (!chapters || chapters.length === 0) return 0;
        
        return chapters.reduce((total, chapter) => {
            const content = chapter.content || '';
            
            const textContent = content.replace(/<[^>]*>/g, '').trim();
            const words = textContent ? textContent.split(/\s+/).length : 0;
            return total + words;
        }, 0);
    };

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
            setError('Greška pri učitavanju dokumenata');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (thesis) => {
        
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
                        <img src="/icons/add.png" alt="Add" className="btn-icon" />
                        Kreiraj novi dokument
                    </button>
                )}
            </div>

            <div className="documents-table">
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
                    <div className="table-container">
                        <div className="table-header">
                            <div className="header-cell title-col">Naslov rada</div>
                            <div className="header-cell author-col">Autor</div>
                            <div className="header-cell mentor-col">Mentor</div>
                            <div className="header-cell stats-col">Statistike</div>
                            <div className="header-cell date-col">Zadnje mijenjanje</div>
                            <div className="header-cell action-col">Akcija</div>
                        </div>
                        <div className="table-body">
                            {theses.map(thesis => {
                                
                                const totalWords = calculateTotalWords(thesis.chapters || []);
                                
                                return (
                                    <div
                                        key={thesis.id}
                                        className="table-row"
                                        onClick={() => handleSelect(thesis)}
                                    >
                                        <div className="table-cell title-col">
                                            <h3 
                                                className={`document-title ${(thesis.metadata?.title || '').length > 50 ? 'long-title' : ''}`}
                                                title={thesis.metadata?.title || 'Neznani naslov'}
                                            >
                                                {thesis.metadata?.title || 'Neznani naslov'}
                                            </h3>
                                            <p className="document-subtitle">
                                                {thesis.metadata?.faculty || 'Fakultet nije specificiran'}
                                            </p>
                                        </div>
                                        <div className="table-cell author-col">
                                            <div className="author-info">
                                                <strong>{thesis.metadata?.author || 'Nepoznat autor'}</strong>
                                                <small>{thesis.metadata?.academicYear || ''}</small>
                                            </div>
                                        </div>
                                        <div className="table-cell mentor-col">
                                            <div className="mentor-info">
                                                {thesis.metadata?.mentor || 'Mentor nije dodělen'}
                                            </div>
                                        </div>
                                        <div className="table-cell stats-col">
                                            <div className="stats-info">
                                                <div className="stat-item">
                                                    <span className="stat-label">Riječi:</span>
                                                    <span className="stat-value">{totalWords.toLocaleString()}</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Poglavlja:</span>
                                                    <span className="stat-value">{thesis.chapters?.length || 0}</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div 
                                                        className="progress-fill"
                                                        style={{
                                                            width: `${Math.min((totalWords / (thesis.metadata?.recommendedWordCount || 15000)) * 100, 100)}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <small className="progress-text">
                                                    {totalWords} / {thesis.metadata?.recommendedWordCount || 15000} riječi
                                                </small>
                                            </div>
                                        </div>
                                        <div className="table-cell date-col">
                                            <div className="date-info">
                                                <strong>{new Date(thesis.updated).toLocaleDateString('hr-HR')}</strong>
                                                <small>{new Date(thesis.updated).toLocaleTimeString('hr-HR', {hour: '2-digit', minute: '2-digit'})}</small>
                                            </div>
                                        </div>
                                        <div className="table-cell action-col">
                                            <button className="select-btn">
                                                <img src="/icons/open.png" alt="Open" className="btn-icon" />
                                                Otvori
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentSelector;