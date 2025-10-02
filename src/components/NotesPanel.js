import React, { useState, useEffect, useCallback } from 'react';
import './NotesPanel.css';
import { notesAPI } from '../utils/api';
import ConfirmModal from './ConfirmModal';

const NotesPanel = ({ thesis, chapter, mode, user, onCollapsedChange }) => {
    const [notes, setNotes] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showAddNoteForm, setShowAddNoteForm] = useState(false);
    const [newNoteDescription, setNewNoteDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const loadNotes = useCallback(async () => {
        if (!thesis || !chapter) return;
        try {
            setLoading(true);
            console.log('Loading notes for thesis:', thesis.id, 'chapter:', chapter.id);
            const response = await notesAPI.getNotes(thesis.id, chapter.id);
            console.log('Notes loaded:', response.notes);
            setNotes(response.notes || []);
        } catch (error) {
            console.error('Error loading notes:', error);
        } finally {
            setLoading(false);
        }
    }, [thesis, chapter]);

    // Dohvati bilješke za trenutno poglavlje
    useEffect(() => {
        if (thesis && chapter) {
            loadNotes();
        }
    }, [thesis, chapter, loadNotes]);

    const handleAddNote = async () => {
        if (!newNoteDescription.trim()) return;

        try {
            setLoading(true);
            const noteData = {
                thesisId: thesis.id,
                chapterId: chapter.id,
                description: newNoteDescription.trim(),
                author: user?.username || 'Visitor'
            };

            const newNote = await notesAPI.createNote(noteData);
            setNotes(prev => [newNote, ...prev]);
            setNewNoteDescription('');
            setShowAddNoteForm(false);
        } catch (error) {
            console.error('Error creating note:', error);
            // TODO: Dodaj toast notifikaciju
        } finally {
            setLoading(false);
        }
    };

    const handleApproveNote = async (noteId, approved) => {
        try {
            console.log('Approving note:', noteId, 'approved:', approved);
            const updatedNote = await notesAPI.approveNote(noteId, approved);
            setNotes(prev => prev.map(note => 
                note.id === noteId ? updatedNote : note
            ));
        } catch (error) {
            console.error('Error approving note:', error);
            // TODO: Dodaj toast notifikaciju
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
            console.error('Error deleting note:', error);
            // TODO: Dodaj toast notifikaciju
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
        <div className={`notes-panel ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="notes-header">
                {!isCollapsed && <h3>Bilješke</h3>}
                <div className="notes-controls">
                    <button 
                        className="collapse-btn"
                        onClick={() => {
                            const newCollapsed = !isCollapsed;
                            console.log('NotesPanel collapse change:', newCollapsed);
                            setIsCollapsed(newCollapsed);
                            if (onCollapsedChange) {
                                console.log('Calling onCollapsedChange with:', newCollapsed);
                                onCollapsedChange(newCollapsed);
                            }
                        }}
                        title={isCollapsed ? 'Proširi' : 'Smanji'}
                    >
                        {isCollapsed ? '»' : '«'}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
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
                                <img src="/icons/quote.png" alt="Dodaj bilješku" className="quote-icon" />
                                Dodaj bilješku
                            </button>
                        ) : (
                            <div className="add-note-form">
                                <textarea
                                    value={newNoteDescription}
                                    onChange={(e) => setNewNoteDescription(e.target.value)}
                                    placeholder="Unesite opis bilješke..."
                                    rows={3}
                                    className="note-textarea"
                                />
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
                                <p className="no-notes-hint">Dodajte novu bilješku klikom na gumb iznad.</p>
                            </div>
                        ) : (
                            notes.map(note => (
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
                                            title={note.approved ? 'Poništi prihvaćanje' : 'Prihvati bilješku'}
                                        >
                                            {note.approved ? '✓ Prihvaćeno' : 'Prihvati'}
                                        </button>
                                        
                                        <button
                                            className="delete-note-btn"
                                            onClick={() => handleDeleteNote(note.id)}
                                            title="Obriši bilješku"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            
            <ConfirmModal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={confirmDeleteNote}
                title="Brisanje bilješke"
                message="Jeste li sigurni da želite obrisati ovu bilješku? Ova radnja se ne može poništiti."
                confirmText="Obriši"
                cancelText="Odustani"
                type="danger"
            />
        </div>
    );
};

export default NotesPanel;