import React, { useState, useEffect } from 'react';
import ChapterTree from '../components/ChapterTree';
import ChapterEditor from '../components/ChapterEditor';
import ThesisMetadata from '../components/ThesisMetadata';
import DocumentManager from '../components/DocumentManager';
import './DocumentPage.css';

const DocumentPage = ({ mode, user }) => {
    const [currentThesis, setCurrentThesis] = useState(null);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState('chapters'); // chapters, metadata, preview
    const [showDocumentManager, setShowDocumentManager] = useState(false);

    useEffect(() => {
        if (user) {
            loadThesis();
        } else {
            // For non-authenticated users, show demo content
            loadDemoContent();
        }
    }, [user]);

    const loadThesis = async () => {
        try {
            const response = await fetch('/api/theses', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const theses = await response.json();
                if (theses.length > 0) {
                    // Load first thesis or create new one
                    loadFullThesis(theses[0].id);
                } else {
                    createNewThesis();
                }
            }
        } catch (error) {
            console.error('Error loading thesis:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDemoContent = () => {
        // Demo thesis for non-authenticated users
        const demoThesis = {
            id: 'demo',
            metadata: {
                title: 'Primjer diplomskog rada',
                subtitle: 'Demonstracija mogućnosti Poligon sustava',
                author: {
                    name: 'Demo Korisnik',
                    email: 'demo@example.com',
                    studentId: '0000000000'
                },
                mentor: {
                    name: 'prof. dr. sc. Mentor Mentorov',
                    title: 'prof. dr. sc.',
                    department: 'Zavod za računarstvo'
                },
                institution: {
                    name: 'Sveučilište u Zagrebu',
                    faculty: 'Fakultet elektrotehnike i računarstva',
                    department: 'Zavod za elektroniku, mikroelektroniku, računalne i inteligentne sustave',
                    logo: ''
                },
                academic: {
                    degree: 'Master',
                    field: 'Računarstvo',
                    year: 2025
                },
                language: 'hr',
                keywords: ['web aplikacije', 'diplomski rad', 'react', 'node.js'],
                abstract: {
                    hr: 'Ovo je primjer sažetka diplomskog rada na hrvatskom jeziku. Prikazuje kako bi mogao izgledati finalni dokument kreiran u Poligon sustavu.',
                    en: 'This is an example of thesis abstract in English language. It shows how the final document created in Poligon system could look like.'
                }
            },
            chapters: [
                {
                    id: 'demo-1',
                    title: '1. Uvod',
                    content: '<h2>Uvod</h2><p>Ovo je primjer uvoda u diplomski rad. Ovdje objašnjavamo motivaciju, ciljeve i strukturu rada.</p><p>Poligon sustav omogućuje kreiranje strukturiranih akademskih dokumenata s naprednim mogućnostima uređivanja.</p>',
                    order: 0,
                    children: []
                },
                {
                    id: 'demo-2',
                    title: '2. Pregled literature',
                    content: '<h2>Pregled literature</h2><p>U ovom poglavlju analiziramo postojeća rješenja i istraživanja vezana uz našu temu.</p>',
                    order: 1,
                    children: []
                },
                {
                    id: 'demo-3',
                    title: '3. Metodologija',
                    content: '<h2>Metodologija</h2><p>Opisujemo pristup i metode koje koristimo u našem istraživanju.</p>',
                    order: 2,
                    children: []
                }
            ],
            stats: {
                word_count: 247,
                chapter_count: 3,
                page_count: 1
            }
        };
        
        setCurrentThesis(demoThesis);
        setSelectedChapter(demoThesis.chapters[0]);
        setLoading(false);
    };

    const loadFullThesis = async (thesisId) => {
        try {
            const response = await fetch(`/api/theses/${thesisId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const thesis = await response.json();
                setCurrentThesis(thesis);
                
                // Select first chapter if exists
                if (thesis.chapters.length > 0) {
                    setSelectedChapter(thesis.chapters[0]);
                }
            }
        } catch (error) {
            console.error('Error loading full thesis:', error);
        }
    };

    const createNewThesis = async () => {
        try {
            const newThesis = {
                metadata: {
                    title: 'Nova diplomska radnja',
                    subtitle: '',
                    author: {
                        name: user.name || '',
                        email: user.email,
                        studentId: ''
                    },
                    mentor: {
                        name: '',
                        title: '',
                        department: ''
                    },
                    institution: {
                        name: 'Sveučilište u Zagrebu',
                        department: '',
                        faculty: '',
                        logo: ''
                    },
                    academic: {
                        degree: 'Bachelor',
                        field: '',
                        year: new Date().getFullYear()
                    },
                    language: 'hr'
                }
            };

            const response = await fetch('/api/theses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(newThesis)
            });

            if (response.ok) {
                const thesis = await response.json();
                setCurrentThesis(thesis);
            }
        } catch (error) {
            console.error('Error creating thesis:', error);
        }
    };

    const handleChapterSelect = (chapter) => {
        setSelectedChapter(chapter);
    };

    const handleAddChapter = async (parentId = null) => {
        if (!currentThesis) return;

        try {
            const newChapterData = {
                title: 'Novo poglavlje',
                content: '',
                parent_id: parentId
            };

            const response = await fetch(`/api/theses/${currentThesis.id}/chapters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(newChapterData)
            });

            if (response.ok) {
                // Reload thesis to get updated structure
                loadFullThesis(currentThesis.id);
            }
        } catch (error) {
            console.error('Error adding chapter:', error);
        }
    };

    const handleUpdateChapter = async (chapterId, updates) => {
        if (!currentThesis) return;

        try {
            const response = await fetch(`/api/theses/${currentThesis.id}/chapters/${chapterId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                const updatedChapter = await response.json();
                
                // Update selected chapter if it's the one being updated
                if (selectedChapter && selectedChapter.id === chapterId) {
                    setSelectedChapter(updatedChapter);
                }
                
                // Update thesis structure
                loadFullThesis(currentThesis.id);
            }
        } catch (error) {
            console.error('Error updating chapter:', error);
        }
    };

    const handleAutoSave = async (chapterId, content) => {
        if (!currentThesis || mode !== 'EDIT') return;

        setSaving(true);
        try {
            const response = await fetch(`/api/theses/${currentThesis.id}/chapters/${chapterId}/autosave`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                const result = await response.json();
                // Update word count in real-time
                if (selectedChapter && selectedChapter.id === chapterId) {
                    setSelectedChapter({
                        ...selectedChapter,
                        content,
                        updated: result.updated
                    });
                }
            }
        } catch (error) {
            console.error('Error auto-saving:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteChapter = async (chapterId) => {
        if (!currentThesis) return;

        if (confirm('Jeste li sigurni da želite obrisati ovo poglavlje?')) {
            try {
                const response = await fetch(`/api/theses/${currentThesis.id}/chapters/${chapterId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    // Clear selection if deleted chapter was selected
                    if (selectedChapter && selectedChapter.id === chapterId) {
                        setSelectedChapter(null);
                    }
                    
                    // Reload thesis
                    loadFullThesis(currentThesis.id);
                }
            } catch (error) {
                console.error('Error deleting chapter:', error);
            }
        }
    };

    const handleUpdateMetadata = async (metadata) => {
        if (!currentThesis) return;

        try {
            const response = await fetch(`/api/theses/${currentThesis.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ metadata })
            });

            if (response.ok) {
                const updatedThesis = await response.json();
                setCurrentThesis(updatedThesis);
            }
        } catch (error) {
            console.error('Error updating metadata:', error);
        }
    };

    const handleCreateDocument = async (documentData) => {
        try {
            const response = await fetch('/api/theses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ metadata: documentData })
            });

            if (response.ok) {
                const thesis = await response.json();
                setCurrentThesis(thesis);
                setSelectedChapter(null);
            }
        } catch (error) {
            console.error('Error creating document:', error);
        }
    };

    const handleEditDocument = async (documentData) => {
        if (!currentThesis) return;
        
        try {
            const response = await fetch(`/api/theses/${currentThesis.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ metadata: documentData })
            });

            if (response.ok) {
                const updatedThesis = await response.json();
                setCurrentThesis(updatedThesis);
            }
        } catch (error) {
            console.error('Error updating document:', error);
        }
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

    if (!currentThesis) {
        return (
            <div className="document-page error">
                <div className="error-message">
                    <h2>Greška prilikom učitavanja</h2>
                    <p>Nije moguće učitati dokument.</p>
                    <button onClick={loadThesis} className="retry-btn">
                        Pokušaj ponovno
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`document-page ${mode.toLowerCase()}`}>
            {saving && (
                <div className="saving-indicator">
                    <div className="saving-spinner"></div>
                    <span>Sprema...</span>
                </div>
            )}

            <div className="document-header">
                <div className="document-title">
                    <h1>{currentThesis.metadata.title}</h1>
                    <div className="document-stats">
                        <span>{currentThesis.stats.word_count} riječi</span>
                        <span>{currentThesis.stats.chapter_count} poglavlja</span>
                        <span>Zadnje ažuriranje: {new Date(currentThesis.updated || new Date()).toLocaleDateString('hr-HR')}</span>
                    </div>
                </div>

                <div className="header-controls">
                    {mode === 'EDIT' && user && (
                        <div className="document-actions">
                            <button 
                                className="action-btn"
                                onClick={() => setShowDocumentManager(true)}
                                title="Upravljanje dokumentima"
                            >
                                �️ Dokumenti
                            </button>
                        </div>
                    )}

                    <div className="view-switcher">
                        <button 
                            className={view === 'chapters' ? 'active' : ''}
                            onClick={() => setView('chapters')}
                        >
                            Poglavlja
                        </button>
                        <button 
                            className={view === 'metadata' ? 'active' : ''}
                            onClick={() => setView('metadata')}
                        >
                            Metapodaci
                        </button>
                        <button 
                            className={view === 'preview' ? 'active' : ''}
                            onClick={() => setView('preview')}
                        >
                            Pregled
                        </button>
                    </div>
                </div>
            </div>

            <div className="document-content">
                {view === 'chapters' && (
                    <div className="chapters-view">
                        <div className="sidebar">
                            <ChapterTree
                                chapters={currentThesis.chapters}
                                selectedChapter={selectedChapter}
                                onChapterSelect={handleChapterSelect}
                                onAddChapter={handleAddChapter}
                                onDeleteChapter={handleDeleteChapter}
                                mode={mode}
                            />
                        </div>

                        <div className="main-editor">
                            {selectedChapter ? (
                                <ChapterEditor
                                    chapter={selectedChapter}
                                    onUpdate={handleUpdateChapter}
                                    onAutoSave={handleAutoSave}
                                    mode={mode}
                                />
                            ) : (
                                <div className="no-selection">
                                    <div className="welcome-message">
                                        <h2>Dobro došli u Poligon</h2>
                                        {user ? (
                                            <>
                                                <p>Odaberite poglavlje iz stableta lijevo ili dodajte novo.</p>
                                                {mode === 'EDIT' && (
                                                    <div className="welcome-actions">
                                                        <button 
                                                            className="primary-btn"
                                                            onClick={() => handleAddChapter()}
                                                        >
                                                            + Dodaj prvo poglavlje
                                                        </button>
                                                        <button 
                                                            className="secondary-btn"
                                                            onClick={() => setShowDocumentManager(true)}
                                                        >
                                                            �️ Upravljaj dokumentima
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p>Pregledate demo sadržaj. Ovaj primjer pokazuje mogućnosti Poligon sustava za kreiranje diplomskih radova.</p>
                                                <p>Prijavite se da biste mogli kreirati i uređivati vlastite dokumente.</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'metadata' && (
                    <ThesisMetadata
                        metadata={currentThesis.metadata}
                        onUpdate={handleUpdateMetadata}
                        mode={mode}
                    />
                )}

                {view === 'preview' && (
                    <div className="preview-view">
                        <h2>Pregled dokumenta</h2>
                        <p>Ovdje će biti prikazan pregled završenog dokumenta...</p>
                    </div>
                )}
            </div>

            {showDocumentManager && (
                <DocumentManager
                    onClose={() => setShowDocumentManager(false)}
                    onCreateDocument={handleCreateDocument}
                    onEditDocument={handleEditDocument}
                    currentThesis={currentThesis}
                    mode={mode}
                />
            )}
        </div>
    );
};

export default DocumentPage;