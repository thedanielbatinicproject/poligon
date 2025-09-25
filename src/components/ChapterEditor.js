import React, { useState, useEffect } from 'react';
import './ChapterEditor.css';

const ChapterEditor = ({ thesis, selectedChapter, onThesisUpdate, onChapterSelect, mode, user }) => {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (thesis) {
            setChapters(thesis.chapters || []);
        }
    }, [thesis]);

    const getAuthHeaders = () => {
        const sessionId = localStorage.getItem('sessionId');
        return sessionId ? { 'Authorization': `Bearer ${sessionId}` } : {};
    };

    const addChapter = async () => {
        if (!thesis || !user) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/theses/${thesis.id}/chapters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    title: 'Novo poglavlje',
                    content: ''
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
            }
        } catch (error) {
            console.error('Error deleting chapter:', error);
        }
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
                                    onClick={addChapter}
                                    disabled={loading}
                                    className="primary-btn"
                                >
                                    Dodaj prvo poglavlje
                                </button>
                            )}
                        </div>
                    ) : (
                        chapters.map((chapter, index) => (
                            <div
                                key={chapter.id}
                                className={`chapter-item ${selectedChapter?.id === chapter.id ? 'selected' : ''}`}
                                onClick={() => onChapterSelect(chapter)}
                            >
                                <div className="chapter-info">
                                    <span className="chapter-number">{index + 1}.</span>
                                    <span className="chapter-title">
                                        {chapter.title || 'Bez naslova'}
                                    </span>
                                </div>
                                {mode === 'EDIT' && user && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteChapter(chapter.id);
                                        }}
                                        className="delete-chapter-btn"
                                        title="Obriši poglavlje"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))
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
