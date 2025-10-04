import React, { useState, useEffect, useRef } from 'react';
import './ChapterEditor.css';
import ScientificEditor from './ScientificEditor';
import NotesPanel from './NotesPanel';
import { thesesAPI } from '../utils/api';

const ChapterEditor = ({ thesis, selectedChapter, onThesisUpdate, onChapterSelect, mode, user }) => {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [hoveredChapter, setHoveredChapter] = useState(null);
    const [notesState, setNotesState] = useState(0); 

    
    useEffect(() => {
        const handleNotesStateChange = (event) => {
            if (event.detail && typeof event.detail.collapsed === 'boolean') {
                const newState = event.detail.collapsed ? 1 : 0;
                setNotesState(newState);
            }
        };

        window.addEventListener('notesStateChange', handleNotesStateChange);
        return () => {
            window.removeEventListener('notesStateChange', handleNotesStateChange);
        };
    }, []);

    
    useEffect(() => {
        const element = document.querySelector('[data-content-body="true"]');
        if (element) {
            if (notesState === 1) {
                element.classList.add('notes-collapsed');
            } else {
                element.classList.remove('notes-collapsed');
            }
        }
        window.dispatchEvent(new CustomEvent('notesCollapsedChange', { 
            detail: { collapsed: notesState === 1 } 
        }));
    }, [notesState]);

    useEffect(() => {
        if (thesis) {
            setChapters(thesis.chapters || []);
        }
    }, [thesis]);

    
    const organizeChapters = (chapters) => {
        const organized = [];
        const chapterMap = new Map();
        
        
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

    const addChapter = async (parentChapterId = null) => {
        if (!thesis || !user) return;

        const parentChapter = parentChapterId ? chapters.find(c => c.id === parentChapterId) : null;
        const level = parentChapter ? (parentChapter.level || 0) + 1 : 0;

        try {
            setLoading(true);
            const result = await thesesAPI.addChapter(thesis.id, {
                title: level === 0 ? 'Novo poglavlje' : level === 1 ? 'Novo potpoglavlje' : 'Nova sekcija',
                content: '',
                parentId: parentChapterId,
                level: level
            });

            if (result.success) {
                onThesisUpdate(result.data);
                setChapters(result.data.chapters || []);
            } else {
                }
        } catch (error) {
            } finally {
            setLoading(false);
        }
    };

    const updateChapter = async (chapterId, updates) => {
        if (!thesis || !user) return;

        try {
            const result = await thesesAPI.updateChapter(thesis.id, chapterId, updates);
            if (result.success) {
                onThesisUpdate(result.data);
                setChapters(result.data.chapters || []);
            } else {
                }
        } catch (error) {
            }
    };

    const deleteChapter = async (chapterId) => {
        if (!thesis || !user) return;

        try {
            setLoading(true);
            const result = await thesesAPI.deleteChapter(thesis.id, chapterId);
            if (result.success) {
                onThesisUpdate(result.data);
                setChapters(result.data.chapters || []);
                if (selectedChapter && selectedChapter.id === chapterId) {
                    onChapterSelect(null);
                }
                setShowDeleteConfirm(null);
            } else {
                }
        } catch (error) {
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
                            onClick={() => addChapter()}
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
                        thesis={thesis}
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

            {}
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
                                {(chapter.level || 0) < 2 && (
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

const ChapterContent = ({ chapter, thesis, onUpdate, mode, user }) => {
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
        
        const newContent = e.target ? e.target.value : e;
        setContent(newContent);
        setIsDirty(true);
    };

    return (
        <div className="chapter-content">
            <div className="content-header">
                <div className="title-section">
                    {mode === 'VIEW' ? (
                        <h2 className="chapter-title-readonly">{title || 'Bez naslova'}</h2>
                    ) : (
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            className="chapter-title-input"
                            placeholder="Naslov poglavlja"
                        />
                    )}
                </div>
                
                {isDirty && mode === 'EDIT' && (
                    <button onClick={handleSave} className="save-btn">
                        Spremi
                    </button>
                )}
            </div>

            <div className="content-body" data-content-body="true">
                <div className="editor-container">
                    <ScientificEditor
                        value={content}
                        onChange={handleContentChange}
                        chapter={chapter}
                        thesis={thesis}
                        mode={mode}
                        user={user}
                        disabled={mode === 'VIEW'}
                    />
                </div>
                <div className="notes-container">
                    <NotesPanel 
                        thesis={thesis}
                        chapter={chapter}
                        mode={mode}
                        user={user}
                        isCollapsed={false}
                        onCollapsedChange={(collapsed) => { 
                            window.dispatchEvent(new CustomEvent('notesStateChange', { 
                                detail: { collapsed: collapsed } 
                            }));
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ChapterEditor;
