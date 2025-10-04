import React, { useState, useEffect } from 'react';
import ChapterEditor from '../components/ChapterEditor';
import DocumentManager from '../components/DocumentManager';
import DocumentSelector from '../components/DocumentSelector';
import DocumentTasks from '../components/DocumentTasks';
import ChapterTasks from '../components/ChapterTasks';
import { thesesAPI } from '../utils/api';
import './DocumentPage.css';

const DocumentPage = ({ user, onPageChange }) => {
    const [currentThesis, setCurrentThesis] = useState(null);
    const [selectedChapter, setSelectedChapterState] = useState(null);
    const [showDocumentManager, setShowDocumentManager] = useState(false);
    const [showDocumentSelector, setShowDocumentSelector] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState(user ? 'EDIT' : 'VIEW');
    const canEditDocument = (thesis, user) => {
        if (!user || !thesis) return false;
        if (user.role === 'admin') return true;
        const authorId = thesis.metadata?.authorId;
        if (authorId === user.id || thesis.metadata?.author === user.username) return true;
        if (thesis.editorIds && thesis.editorIds.includes(user.id)) return true;
        if (thesis.editors && thesis.editors.includes(user.username)) return true;
        
        return false;
    };

    const setSelectedChapter = (chapter) => {
        setSelectedChapterState(chapter);
        if (chapter) {
            localStorage.setItem('selectedChapterId', chapter.id);
        } else {
            localStorage.removeItem('selectedChapterId');
        }
    };

    useEffect(() => {
        loadInitialDocument();
    }, []); 
    
    useEffect(() => {
        if (!user) {
            setMode('VIEW');
        } else {
            const hasEditPermission = canEditDocument(currentThesis, user);
            setMode(hasEditPermission ? 'EDIT' : 'VIEW');
        }
        
        if (!user && !loading && !currentThesis) {
            setShowDocumentSelector(true);
        }
    }, [user, loading, currentThesis]); 
    useEffect(() => {
        const handleUserUpdated = (event) => {
            if (currentThesis) {
                loadDocumentById(currentThesis.id);
            }
        };

        window.addEventListener('userUpdated', handleUserUpdated);
        
        return () => {
            window.removeEventListener('userUpdated', handleUserUpdated);
        };
    }, [currentThesis]);

    const loadDocumentById = async (documentId) => {
        try {
            const result = await thesesAPI.getById(documentId);
            if (result.success) {
                setCurrentThesis(result.data);
                
                const hasEditPermission = canEditDocument(result.data, user);
                setMode(hasEditPermission ? 'EDIT' : 'VIEW');
            }
        } catch (error) {
        }
    };

    const loadInitialDocument = async () => {
        try {
            setLoading(true);
            
            
            const savedDocId = localStorage.getItem('selectedDocumentId');
            if (savedDocId) {
                const result = await thesesAPI.getById(savedDocId);
                if (result.success) {
                    setCurrentThesis(result.data);
                    
                    
                    const savedChapterId = localStorage.getItem('selectedChapterId');
                    if (savedChapterId && result.data.chapters) {
                        const chapter = result.data.chapters.find(c => c.id === savedChapterId);
                        if (chapter) {
                            setSelectedChapterState(chapter);
                        }
                    }
                    
                    setLoading(false);
                    return;
                }
            }

            
            if (user) {
                const result = await thesesAPI.getAll();
                if (result.success && result.data.length > 0) {
                    setCurrentThesis(result.data[0]);
                    localStorage.setItem('selectedDocumentId', result.data[0].id);
                    
                    
                    const savedChapterId = localStorage.getItem('selectedChapterId');
                    if (savedChapterId && result.data[0].chapters) {
                        const chapter = result.data[0].chapters.find(c => c.id === savedChapterId);
                        if (chapter) {
                            setSelectedChapterState(chapter);
                        }
                    }
                }
            }
            
        } catch (error) {
            } finally {
            setLoading(false);
        }
    };

    const handleDocumentSelect = (thesis) => {
        setCurrentThesis(thesis);
        setSelectedChapter(null);
        setShowDocumentSelector(false);
        localStorage.setItem('selectedDocumentId', thesis.id);
        if (user) {
            const hasEditPermission = canEditDocument(thesis, user);
            setMode(hasEditPermission ? 'EDIT' : 'VIEW');
        }
    };

    const createNewThesis = async () => {
        try {
            const thesisData = {
                metadata: {
                    title: 'Novi diplomski rad',
                    author: user?.username || 'Student',
                    authorId: user?.id,
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
                if (user) {
                    const hasEditPermission = canEditDocument(result.data, user);
                    setMode(hasEditPermission ? 'EDIT' : 'VIEW');
                }
            } else {
                }
        } catch (error) {
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
                            <img src="/icons/change.png" alt="Change" className="btn-icon" /> Promijeni dokument
                        </button>
                        {mode === 'EDIT' && user && (
                            <>
                                <button 
                                    className="action-btn primary-btn"
                                    onClick={createNewThesis}
                                    title="Kreiraj novi dokument"
                                >
                                    <img src="/icons/add.png" alt="Add" className="btn-icon" /> Novi dokument
                                </button>
                                <button 
                                    className="action-btn secondary-btn"
                                    onClick={() => setShowDocumentManager(true)}
                                    title="Upravljanje dokumentima"
                                >
                                    <img src="/icons/manage.png" alt="Manage" className="btn-icon" /> Upravljaj dokumentima
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
                    <DocumentTasks 
                        documentId={currentThesis.id}
                        user={user}
                        isAuthenticated={!!user}
                    />
                    <ChapterEditor
                        thesis={currentThesis}
                        selectedChapter={selectedChapter}
                        onThesisUpdate={(updatedThesis) => {
                            setCurrentThesis(updatedThesis);
                            
                            if (selectedChapter && updatedThesis.chapters) {
                                const updatedChapter = updatedThesis.chapters.find(c => c.id === selectedChapter.id);
                                if (updatedChapter) {
                                    setSelectedChapterState(updatedChapter);
                                } else {
                                    
                                    setSelectedChapter(null);
                                }
                            }
                        }}
                        onChapterSelect={setSelectedChapter}
                        mode={mode}
                        user={user}
                    />
                    
                    {selectedChapter && (
                        <ChapterTasks 
                            documentId={currentThesis.id}
                            chapterId={selectedChapter.id}
                            chapterTitle={selectedChapter.title}
                            user={user}
                            isAuthenticated={!!user}
                        />
                    )}
                </div>
            )}

            {showDocumentManager && (
                <DocumentManager
                    thesis={currentThesis}
                    onClose={() => setShowDocumentManager(false)}
                    onThesisUpdate={setCurrentThesis}
                    onDocumentDeleted={() => {
                        setCurrentThesis(null);
                        setSelectedChapter(null); 
                        setShowDocumentManager(false);
                        setShowDocumentSelector(true);
                    }}
                />
            )}
        </div>
    );
};

export default DocumentPage;
