import React, { useState, useEffect, useCallback } from 'react';
import './NotesPanel.css';
import { notesAPI } from '../../utils/api';
import ConfirmModal from '../ConfirmModal';

const NotesPanel = ({ thesis, chapter, mode, user, onCollapsedChange, isCollapsed = false }) => {
    const [notes, setNotes] = useState([]);
    const [displayedNotes, setDisplayedNotes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAddNoteForm, setShowAddNoteForm] = useState(false);
    const [newNoteDescription, setNewNoteDescription] = useState('');
    const [newNoteAuthor, setNewNoteAuthor] = useState(user?.username || 'Visitor');
    const [newNoteLineNumber, setNewNoteLineNumber] = useState('');
    const [newNoteSelectedText, setNewNoteSelectedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [collapsed, setCollapsed] = useState(isCollapsed);

    const NOTES_PER_PAGE = 3;

    
    useEffect(() => {
        const handleCollapseChange = (event) => {
            if (event.detail && typeof event.detail.collapsed === 'boolean') {
                setCollapsed(event.detail.collapsed);
            }
        };

        window.addEventListener('notesCollapsedChange', handleCollapseChange);
        return () => {
            window.removeEventListener('notesCollapsedChange', handleCollapseChange);
        };
    }, []);

    
    useEffect(() => {
        const handleNoteCreated = (event) => {
            const { note, thesisId, chapterId } = event.detail || {};
            
            
            if (note && thesisId === thesis?.id && chapterId === chapter?.id) {
                
                setNotes(prevNotes => [note, ...prevNotes]);
            }
        };

        window.addEventListener('noteCreated', handleNoteCreated);
        return () => {
            window.removeEventListener('noteCreated', handleNoteCreated);
        };
    }, [thesis?.id, chapter?.id]);

    const loadNotes = useCallback(async () => {
        if (!thesis || !chapter) return;
        try {
            setLoading(true);

            const response = await notesAPI.getNotes(thesis.id, chapter.id);

            if (response.success && response.data) {

                setNotes(response.data.notes || []);
            } else {
                setNotes([]);
            }
        } catch (error) {
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [thesis, chapter]);

    
    const sortNotes = useCallback((notesList) => {
        return notesList.sort((a, b) => {
            
            if (a.approved !== b.approved) {
                return a.approved - b.approved; 
            }
            
            return new Date(b.created) - new Date(a.created);
        });
    }, []);

    
    const updateDisplayedNotes = useCallback(() => {
        const sortedNotes = sortNotes([...notes]);
        const startIndex = 0;
        const endIndex = currentPage * NOTES_PER_PAGE;
        setDisplayedNotes(sortedNotes.slice(startIndex, endIndex));
    }, [notes, currentPage, sortNotes]);

    
    useEffect(() => {
        if (thesis && chapter) {
            loadNotes();
            setCurrentPage(1); 
        }
    }, [thesis, chapter, loadNotes]);

    
    useEffect(() => {
        updateDisplayedNotes();
    }, [updateDisplayedNotes]);

    
    const handleLoadMore = () => {
        setCurrentPage(prev => prev + 1);
    };

    
    const hasMoreNotes = displayedNotes.length < notes.length;

    const handleAddNote = async () => {
        if (!newNoteDescription.trim()) return;

        try {
            setLoading(true);
            const noteData = {
                thesisId: thesis.id,
                chapterId: chapter.id,
                description: newNoteDescription.trim(),
                author: newNoteAuthor.trim() || 'Visitor',
                lineNumber: newNoteLineNumber ? parseInt(newNoteLineNumber) : null,
                selectedText: newNoteSelectedText.trim() || null
            };

            const response = await notesAPI.createNote(noteData);
            if (response.success && response.data) {
                setNotes(prev => [response.data, ...prev]);
            }
            
            setNewNoteDescription('');
            setNewNoteAuthor(user?.username || 'Visitor');
            setNewNoteLineNumber('');
            setNewNoteSelectedText('');
            setShowAddNoteForm(false);
        } catch (error) {
            } finally {
            setLoading(false);
        }
    };

    const handleApproveNote = async (noteId, approved) => {
        try {

            const response = await notesAPI.approveNote(noteId, approved);
            if (response.success && response.data) {
                setNotes(prev => prev.map(note => 
                    note.id === noteId ? response.data : note
                ));
            }
        } catch (error) {
            }
    };

    const handleDeleteNote = async (noteId) => {
        setDeleteConfirm(noteId);
    };

    const confirmDeleteNote = async () => {
        if (!deleteConfirm) return;
        
        try {
            await notesAPI.deleteNote(deleteConfirm);
            setNotes(prev => prev.filter(note => note.id !== deleteConfirm));
            setDeleteConfirm(null);
        } catch (error) {
            }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('hr-HR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!thesis || !chapter) {
        return null;
    }

    return (
        <div className={`notes-panel ${collapsed ? 'collapsed' : ''}`}>
            <div className="notes-header">
                {!collapsed && <h3>Bilješke</h3>}
                <div className="notes-controls">
                    <button 
                        className="collapse-btn"
                        onClick={() => {
                            const newCollapsed = !collapsed;

                            if (onCollapsedChange) {

                                onCollapsedChange(newCollapsed);
                            }
                        }}
                        title={collapsed ? 'Proširi' : 'Smanji'}
                    >
                        {collapsed ? '»' : '«'}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="notes-content">
                    <div className="notes-section-info">
                        <p className="chapter-info">
                            <strong>{chapter.title}</strong>
                        </p>
                        <p className="notes-count">
                            {notes.length} {notes.length === 1 ? 'bilješka' : 'bilješki'}
                        </p>
                    </div>

                    <div className="add-note-section">
                        {!showAddNoteForm ? (
                            <button 
                                className="add-note-btn"
                                onClick={() => setShowAddNoteForm(true)}
                            >
                                <img src="/icons/quote.png" alt="Dodaj biljesku" className="quote-icon" />
                                Dodaj biljesku
                            </button>
                        ) : (
                            <div className="add-note-form">
                                <div className="form-row">
                                    <label>Autor:</label>
                                    <input
                                        type="text"
                                        value={newNoteAuthor}
                                        onChange={(e) => setNewNoteAuthor(e.target.value)}
                                        placeholder="Ime autora"
                                        className="note-input"
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Broj linije:</label>
                                    <input
                                        type="number"
                                        value={newNoteLineNumber}
                                        onChange={(e) => setNewNoteLineNumber(e.target.value)}
                                        placeholder="Broj linije (opcionalno)"
                                        className="note-input"
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Selektirani tekst:</label>
                                    <input
                                        type="text"
                                        value={newNoteSelectedText}
                                        onChange={(e) => setNewNoteSelectedText(e.target.value)}
                                        placeholder="Selektirani tekst (opcionalno)"
                                        className="note-input"
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Opis:</label>
                                    <textarea
                                        value={newNoteDescription}
                                        onChange={(e) => setNewNoteDescription(e.target.value)}
                                        placeholder="Unesite opis bilješke..."
                                        rows={3}
                                        className="note-textarea"
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Datum kreiranja:</label>
                                    <input
                                        type="text"
                                        value={new Date().toLocaleString('hr-HR')}
                                        disabled
                                        className="note-input disabled"
                                    />
                                </div>
                                <div className="form-buttons">
                                    <button 
                                        className="save-note-btn"
                                        onClick={handleAddNote}
                                        disabled={loading || !newNoteDescription.trim()}
                                    >
                                        {loading ? 'Spremam...' : 'Spremi'}
                                    </button>
                                    <button 
                                        className="cancel-note-btn"
                                        onClick={() => {
                                            setShowAddNoteForm(false);
                                            setNewNoteDescription('');
                                            setNewNoteAuthor(user?.username || 'Visitor');
                                            setNewNoteLineNumber('');
                                            setNewNoteSelectedText('');
                                        }}
                                    >
                                        Odustani
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="notes-list">
                        {loading && notes.length === 0 ? (
                            <div className="loading">Učitavam bilješke...</div>
                        ) : notes.length === 0 ? (
                            <div className="no-notes">
                                <p>Nema bilješki za ovo poglavlje.</p>
                                <p className="no-notes-hint">Dodajte novu biljesku klikom na gumb iznad.</p>
                            </div>
                        ) : (
                            <>
                                {displayedNotes.map(note => (
                                <div 
                                    key={note.id} 
                                    className={`note-item ${note.approved ? 'approved' : 'pending'}`}
                                >
                                    <div className="note-header">
                                        <span className="note-author">{note.author}</span>
                                        <span className="note-date">{formatDate(note.created)}</span>
                                    </div>
                                    
                                    {note.selectedText && (
                                        <div className="note-selected-text">
                                            <em>"{note.selectedText}"</em>
                                        </div>
                                    )}
                                    
                                    {note.lineNumber && (
                                        <div className="note-line-number">
                                            Linija {note.lineNumber}
                                        </div>
                                    )}
                                    
                                    <div className="note-description">
                                        {note.description}
                                    </div>
                                    
                                    <div className="note-actions">
                                        <button
                                            className={`approve-btn ${note.approved ? 'approved' : 'pending'}`}
                                            onClick={() => handleApproveNote(note.id, !note.approved)}
                                            title={note.approved ? 'Poništi prihvaćanje' : 'Prihvati biljesku'}
                                        >
                                            {note.approved ? '✓ Prihvaćeno' : 'Prihvati'}
                                        </button>
                                        
                                        <button
                                            className="delete-note-btn"
                                            onClick={() => handleDeleteNote(note.id)}
                                            title="Obriši biljesku"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                ))}
                                
                                {hasMoreNotes && (
                                    <div className="load-more-container">
                                        <button 
                                            className="load-more-btn" 
                                            onClick={handleLoadMore}
                                            disabled={loading}
                                        >
                                            {loading ? 'Učitavam...' : 'Učitaj više'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
            
            <ConfirmModal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={confirmDeleteNote}
                title="Brisanje bilješke"
                message="Jeste li sigurni da želite obrisati ovu biljesku? Ova radnja se ne može poništiti."
                confirmText="Obriši"
                cancelText="Odustani"
                type="danger"
            />
        </div>
    );
};

export default NotesPanel;