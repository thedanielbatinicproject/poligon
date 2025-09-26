import React, { useState, useEffect } from 'react';
import ChapterEditor from '../components/ChapterEditor';
import DocumentManager from '../components/DocumentManager';
import DocumentSelector from '../components/DocumentSelector';
import { thesesAPI } from '../utils/api';
import './DocumentPage.css';

const DocumentPage = ({ user }) => {
    const [currentThesis, setCurrentThesis] = useState(null);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [showDocumentManager, setShowDocumentManager] = useState(false);
    const [showDocumentSelector, setShowDocumentSelector] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState(user ? 'EDIT' : 'VIEW');

    useEffect(() => {
        loadInitialDocument();
    }, []); // Pozovi samo jednom na mount
    
    useEffect(() => {
        setMode(user ? 'EDIT' : 'VIEW');
        
        // U VIEW režimu (bez korisnika), prikaži selektor ako nema dokumenta
        if (!user && !loading) {
            setShowDocumentSelector(true);
        }
    }, [user, loading]); // Promeni mode kada se user ili loading promeni

    // Uklanjamo getAuthHeaders jer API helper automatski rukuje cookies

    const loadInitialDocument = async () => {
        try {
            setLoading(true);
            
            // Pokušaj učitati dokument iz localStorage
            const savedDocId = localStorage.getItem('selectedDocumentId');
            if (savedDocId) {
                const result = await thesesAPI.getById(savedDocId);
                if (result.success) {
                    setCurrentThesis(result.data);
                    setLoading(false);
                    return;
                }
            }

            // U EDIT režimu, učitaj prvi dostupni dokument automatski
            if (user) {
                const result = await thesesAPI.getAll();
                if (result.success && result.data.length > 0) {
                    setCurrentThesis(result.data[0]);
                    localStorage.setItem('selectedDocumentId', result.data[0].id);
                }
            }
            // U VIEW režimu, ne učitavaj automatski - korisnik mora odabrati
        } catch (error) {
            console.error('Error loading document:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentSelect = (thesis) => {
        setCurrentThesis(thesis);
        setSelectedChapter(null);
        setShowDocumentSelector(false);
    };

    const createNewThesis = async () => {
        try {
            const thesisData = {
                metadata: {
                    title: 'Novi diplomski rad',
                    author: 'Student',
                    mentor: 'Mentor',
                    university: 'Sveučilište',
                    faculty: 'Fakultet',
                    department: 'Odsjek',
                    academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                    recommendedWordCount: 15000
                }
            };

            const result = await thesesAPI.create(thesisData);
            
            if (result.success) {
                setCurrentThesis(result.data);
                setSelectedChapter(null);
                localStorage.setItem('selectedDocumentId', result.data.id);
            } else {
                console.error('Failed to create thesis:', result.status);
            }
        } catch (error) {
            console.error('Error creating thesis:', error);
        }
    };

    const handleCreateNewFromSelector = async () => {
        setShowDocumentSelector(false);
        await createNewThesis();
    };

    if (loading) {
        return (
            <div className="document-page loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Učitava dokumenta...</p>
                </div>
            </div>
        );
    }

    if (showDocumentSelector) {
        return (
            <div className="document-page">
                <DocumentSelector
                    user={user}
                    onDocumentSelect={handleDocumentSelect}
                    onCreateNew={handleCreateNewFromSelector}
                />
            </div>
        );
    }

    return (
        <div className="document-page">
            <div className="document-header">
                <div className="header-info">
                    <h1 className="document-title">
                        {currentThesis?.metadata?.title || 'Nema odabranog dokumenta'}
                    </h1>
                    {currentThesis && (
                        <div className="document-meta">
                            <span className="author">Autor: {currentThesis.metadata?.author}</span>
                            <span className="updated">
                                Zadnje ažuriranje: {new Date(currentThesis.updated).toLocaleDateString('hr-HR')}
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="header-controls">
                    <div className="document-actions">
                        <button 
                            className="action-btn secondary-btn"
                            onClick={() => setShowDocumentSelector(true)}
                            title="Promijeni dokument"
                        >
                            📁 Promijeni dokument
                        </button>
                        {mode === 'EDIT' && user && (
                            <>
                                <button 
                                    className="action-btn primary-btn"
                                    onClick={createNewThesis}
                                    title="Kreiraj novi dokument"
                                >
                                    + Novi dokument
                                </button>
                                <button 
                                    className="action-btn secondary-btn"
                                    onClick={() => setShowDocumentManager(true)}
                                    title="Upravljanje dokumentima"
                                >
                                    ⚙️ Upravljaj dokumentima
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {!currentThesis ? (
                <div className="no-document">
                    <h2>{mode === 'VIEW' ? 'Odaberite dokument za pregled' : 'Nema dostupnih dokumenata'}</h2>
                    <p>{mode === 'VIEW' ? 'Odaberite diplomski rad koji želite pregledati.' : 'Trenutno nema diplomskog rada za prikaz.'}</p>
                    <div className="no-document-actions">
                        <button 
                            onClick={() => setShowDocumentSelector(true)}
                            className="primary-btn"
                        >
                            📁 Odaberi dokument
                        </button>
                        {mode === 'EDIT' && user && (
                            <button 
                                onClick={createNewThesis}
                                className="primary-btn"
                                style={{marginLeft: '15px'}}
                            >
                                + Kreiraj novi dokument
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="document-content">
                    <ChapterEditor
                        thesis={currentThesis}
                        selectedChapter={selectedChapter}
                        onThesisUpdate={setCurrentThesis}
                        onChapterSelect={setSelectedChapter}
                        mode={mode}
                        user={user}
                    />
                </div>
            )}

            {showDocumentManager && (
                <DocumentManager
                    thesis={currentThesis}
                    onClose={() => setShowDocumentManager(false)}
                    onThesisUpdate={setCurrentThesis}
                />
            )}
        </div>
    );
};

export default DocumentPage;
