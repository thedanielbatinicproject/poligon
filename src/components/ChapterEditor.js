import React, { useState, useEffect } from 'react';
import './ChapterEditor.css';

const ChapterEditor = ({ thesis, selectedChapter, onThesisUpdate, onChapterSelect, mode, user }) => {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [hoveredChapter, setHoveredChapter] = useState(null);

    useEffect(() => {
        if (thesis) {
            setChapters(thesis.chapters || []);
        }
    }, [thesis]);

    // Organizacija poglavlja u hijerarhiju
    const organizeChapters = (chapters) => {
        const organized = [];
        const chapterMap = new Map();
        
        // Sortiraj po order
        const sortedChapters = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        sortedChapters.forEach(chapter => {
            chapterMap.set(chapter.id, { ...chapter, children: [] });
        });
        
        sortedChapters.forEach(chapter => {
            const chapterWithChildren = chapterMap.get(chapter.id);
            if (chapter.parentId && chapterMap.has(chapter.parentId)) {
                chapterMap.get(chapter.parentId).children.push(chapterWithChildren);
            } else {
                organized.push(chapterWithChildren);
            }
        });
        
        return organized;
    };

    // Generiranje brojeva poglavlja (1, 1.1, 1.1.1, itd.)
    const generateChapterNumber = (chapter, parentNumber = '') => {
        const level = chapter.level || 0;
        if (level === 0) {
            const mainChapters = chapters.filter(c => (c.level || 0) === 0);
            const index = mainChapters.findIndex(c => c.id === chapter.id);
            return `${index + 1}`;
        } else {
            const siblings = chapters.filter(c => c.parentId === chapter.parentId);
            const index = siblings.findIndex(c => c.id === chapter.id);
            return `${parentNumber}.${index + 1}`;
        }
    };

    const getAuthHeaders = () => {
        const sessionId = localStorage.getItem('sessionId');
        return sessionId ? { 'Authorization': `Bearer ${sessionId}` } : {};
    };

    const addChapter = async (parentChapterId = null) => {
        if (!thesis || !user) return;

        const parentChapter = parentChapterId ? chapters.find(c => c.id === parentChapterId) : null;
        const level = parentChapter ? (parentChapter.level || 0) + 1 : 0;

        try {
            setLoading(true);
            const response = await fetch(`/api/theses/${thesis.id}/chapters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    title: level === 0 ? 'Novo poglavlje' : level === 1 ? 'Novo potpoglavlje' : 'Nova sekcija',
                    content: '',
                    parentId: parentChapterId,
                    level: level
                })
            });

            if (response.ok) {
                const updatedThesis = await response.json();
                onThesisUpdate(updatedThesis);
                setChapters(updatedThesis.chapters || []);
            } else {
                console.error('Failed to add chapter:', response.status);
            }
        } catch (error) {
            console.error('Error adding chapter:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateChapter = async (chapterId, updates) => {
        if (!thesis || !user) return;

        try {
            const response = await fetch(`/api/theses/${thesis.id}/chapters/${chapterId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                const updatedThesis = await response.json();
                onThesisUpdate(updatedThesis);
                setChapters(updatedThesis.chapters || []);
            }
        } catch (error) {
            console.error('Error updating chapter:', error);
        }
    };

    const deleteChapter = async (chapterId) => {
        if (!thesis || !user) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/theses/${thesis.id}/chapters/${chapterId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const updatedThesis = await response.json();
                onThesisUpdate(updatedThesis);
                setChapters(updatedThesis.chapters || []);
                if (selectedChapter && selectedChapter.id === chapterId) {
                    onChapterSelect(null);
                }
                setShowDeleteConfirm(null);
            }
        } catch (error) {
            console.error('Error deleting chapter:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (chapter) => {
        const hasChildren = chapters.some(c => c.parentId === chapter.id);
        const chapterType = (chapter.level || 0) === 0 ? 'poglavlje' : 
                          (chapter.level || 0) === 1 ? 'potpoglavlje' : 'sekciju';
        
        const message = hasChildren 
            ? `Jeste li sigurni da želite obrisati ${chapterType} "${chapter.title}" i sav njegov sadržaj uključujući sva potpoglavlja?`
            : `Jeste li sigurni da želite obrisati ${chapterType} "${chapter.title}"?`;
            
        setShowDeleteConfirm({ chapter, message });
    };

    if (!thesis) {
        return (
            <div className="chapter-editor">
                <div className="no-thesis">
                    <p>Nema odabranog dokumenta</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chapter-editor">
            <div className="editor-sidebar">
                <div className="chapters-header">
                    <h3>Poglavlja</h3>
                    {mode === 'EDIT' && user && (
                        <button 
                            onClick={addChapter}
                            disabled={loading}
                            className="add-chapter-btn"
                            title="Dodaj novo poglavlje"
                        >
                            {loading ? '...' : '+'}
                        </button>
                    )}
                </div>
                
                <div className="chapters-list">
                    {chapters.length === 0 ? (
                        <div className="no-chapters">
                            <p>Nema poglavlja</p>
                            {mode === 'EDIT' && user && (
                                <button 
                                    onClick={() => addChapter()}
                                    disabled={loading}
                                    className="primary-btn"
                                >
                                    Dodaj prvo poglavlje
                                </button>
                            )}
                        </div>
                    ) : (
                        <ChapterList 
                            chapters={organizeChapters(chapters)}
                            selectedChapter={selectedChapter}
                            onChapterSelect={onChapterSelect}
                            onAddSubChapter={addChapter}
                            onDeleteChapter={confirmDelete}
                            mode={mode}
                            user={user}
                            hoveredChapter={hoveredChapter}
                            setHoveredChapter={setHoveredChapter}
                            generateChapterNumber={generateChapterNumber}
                        />
                    )}
                </div>
            </div>

            <div className="editor-content">
                {selectedChapter ? (
                    <ChapterContent
                        chapter={selectedChapter}
                        onUpdate={(updates) => updateChapter(selectedChapter.id, updates)}
                        mode={mode}
                        user={user}
                    />
                ) : (
                    <div className="no-chapter-selected">
                        <h3>Odaberite poglavlje za uređivanje</h3>
                        <p>Kliknite na poglavlje u lijevom stupcu da ga otvorite.</p>
                    </div>
                )}
            </div>

            {/* Popup za potvrdu brisanja */}
            {showDeleteConfirm && (
                <div className="delete-confirm-overlay">
                    <div className="delete-confirm-modal">
                        <h3>Potvrda brisanja</h3>
                        <p>{showDeleteConfirm.message}</p>
                        <div className="confirm-buttons">
                            <button 
                                onClick={() => deleteChapter(showDeleteConfirm.chapter.id)}
                                className="confirm-delete-btn"
                                disabled={loading}
                            >
                                {loading ? 'Brišem...' : 'Da, obriši'}
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(null)}
                                className="cancel-delete-btn"
                            >
                                Otkaži
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Nova komponenta za hijerarhijsko prikazivanje poglavlja
const ChapterList = ({ 
    chapters, 
    selectedChapter, 
    onChapterSelect, 
    onAddSubChapter, 
    onDeleteChapter, 
    mode, 
    user, 
    hoveredChapter, 
    setHoveredChapter,
    generateChapterNumber,
    parentNumber = '' 
}) => {
    return (
        <div className="hierarchical-chapters">
            {chapters.map((chapter, index) => (
                <div key={chapter.id} className="chapter-group">
                    <div
                        className={`chapter-item level-${chapter.level || 0} ${
                            selectedChapter?.id === chapter.id ? 'selected' : ''
                        }`}
                        onClick={() => onChapterSelect(chapter)}
                        onMouseEnter={() => setHoveredChapter(chapter.id)}
                        onMouseLeave={() => setHoveredChapter(null)}
                    >
                        <div className="chapter-info">
                            <span className="chapter-number">
                                {generateChapterNumber(chapter, parentNumber)}
                            </span>
                            <span className="chapter-title">
                                {chapter.title || 'Bez naslova'}
                            </span>
                        </div>
                        {mode === 'EDIT' && user && (
                            <div className="chapter-actions">
                                {hoveredChapter === chapter.id && (chapter.level || 0) < 2 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddSubChapter(chapter.id);
                                        }}
                                        className="add-subchapter-btn"
                                        title={`Dodaj ${(chapter.level || 0) === 0 ? 'potpoglavlje' : 'sekciju'}`}
                                    >
                                        +
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChapter(chapter);
                                    }}
                                    className="delete-chapter-btn"
                                    title="Obriši"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                    {chapter.children && chapter.children.length > 0 && (
                        <ChapterList
                            chapters={chapter.children}
                            selectedChapter={selectedChapter}
                            onChapterSelect={onChapterSelect}
                            onAddSubChapter={onAddSubChapter}
                            onDeleteChapter={onDeleteChapter}
                            mode={mode}
                            user={user}
                            hoveredChapter={hoveredChapter}
                            setHoveredChapter={setHoveredChapter}
                            generateChapterNumber={generateChapterNumber}
                            parentNumber={generateChapterNumber(chapter, parentNumber)}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

const ChapterContent = ({ chapter, onUpdate, mode, user }) => {
    const [title, setTitle] = useState(chapter.title || '');
    const [content, setContent] = useState(chapter.content || '');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setTitle(chapter.title || '');
        setContent(chapter.content || '');
        setIsDirty(false);
    }, [chapter]);

    const handleSave = () => {
        onUpdate({ title, content });
        setIsDirty(false);
    };

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
        setIsDirty(true);
    };

    const handleContentChange = (e) => {
        setContent(e.target.value);
        setIsDirty(true);
    };

    return (
        <div className="chapter-content">
            <div className="content-header">
                <div className="title-section">
                    {mode === 'EDIT' && user ? (
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            className="chapter-title-input"
                            placeholder="Naslov poglavlja"
                        />
                    ) : (
                        <h2 className="chapter-title-display">{title || 'Bez naslova'}</h2>
                    )}
                </div>
                
                {mode === 'EDIT' && user && isDirty && (
                    <button onClick={handleSave} className="save-btn">
                        Spremi
                    </button>
                )}
            </div>

            <div className="content-body">
                {mode === 'EDIT' && user ? (
                    <textarea
                        value={content}
                        onChange={handleContentChange}
                        className="content-textarea"
                        placeholder="Sadržaj poglavlja..."
                    />
                ) : (
                    <div className="content-display">
                        {content ? (
                            <pre className="content-text">{content}</pre>
                        ) : (
                            <p className="no-content">Poglavlje nema sadržaj</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChapterEditor;
