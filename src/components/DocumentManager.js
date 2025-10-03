import React, { useState, useEffect } from 'react';
import './DocumentManager.css';
import { thesesAPI } from '../utils/api';

const DocumentManager = ({ thesis, onClose, onThesisUpdate, onDocumentDeleted }) => {
    const [metadata, setMetadata] = useState({
        title: '',
        author: '',
        mentor: '',
        university: '',
        faculty: '',
        department: '',
        academicYear: '',
        recommendedWordCount: 15000
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (thesis && thesis.metadata) {
            setMetadata({ ...metadata, ...thesis.metadata });
        }
    }, [thesis]);

    const handleSave = async () => {
        if (!thesis) return;

        try {
            const result = await thesesAPI.update(thesis.id, { metadata });
            if (result.success) {
                onThesisUpdate(result.data);
                onClose();
            } else {
                console.error('Error updating metadata:', result.status);
            }
        } catch (error) {
            console.error('Error updating metadata:', error);
        }
    };

    const handleDelete = async () => {
        if (!thesis) return;

        try {
            setIsDeleting(true);
            const result = await thesesAPI.delete(thesis.id);
            if (result.success) {
                
                localStorage.removeItem('selectedDocumentId');
                localStorage.removeItem('selectedChapterId');
                
                // Obavijesti roditelja da je dokument obrisan
                if (onDocumentDeleted) {
                    onDocumentDeleted();
                }
                onClose();
            } else {
                console.error('Error deleting thesis:', result.status);
            }
        } catch (error) {
            console.error('Error deleting thesis:', error);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleChange = (field, value) => {
        setMetadata(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="document-manager-overlay">
            <div className="document-manager">
                <div className="manager-header">
                    <h2>Uredi dokumenta</h2>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div className="manager-content">
                    <div className="form-group">
                        <label>Naslov rada:</label>
                        <input
                            type="text"
                            value={metadata.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Unesite naslov diplomskog rada"
                        />
                    </div>

                    <div className="form-group">
                        <label>Autor:</label>
                        <input
                            type="text"
                            value={metadata.author}
                            onChange={(e) => handleChange('author', e.target.value)}
                            placeholder="Ime i prezime autora"
                        />
                    </div>

                    <div className="form-group">
                        <label>Mentor:</label>
                        <input
                            type="text"
                            value={metadata.mentor}
                            onChange={(e) => handleChange('mentor', e.target.value)}
                            placeholder="Ime i prezime mentora"
                        />
                    </div>

                    <div className="form-group">
                        <label>Sveučilište:</label>
                        <input
                            type="text"
                            value={metadata.university}
                            onChange={(e) => handleChange('university', e.target.value)}
                            placeholder="Naziv sveučilišta"
                        />
                    </div>

                    <div className="form-group">
                        <label>Fakultet:</label>
                        <input
                            type="text"
                            value={metadata.faculty}
                            onChange={(e) => handleChange('faculty', e.target.value)}
                            placeholder="Naziv fakulteta"
                        />
                    </div>

                    <div className="form-group">
                        <label>Odsjek:</label>
                        <input
                            type="text"
                            value={metadata.department}
                            onChange={(e) => handleChange('department', e.target.value)}
                            placeholder="Naziv odsjeka"
                        />
                    </div>

                    <div className="form-group">
                        <label>Akademska godina:</label>
                        <input
                            type="text"
                            value={metadata.academicYear}
                            onChange={(e) => handleChange('academicYear', e.target.value)}
                            placeholder="2024/2025"
                        />
                    </div>

                    <div className="form-group">
                        <label>Preporučeni broj riječi:</label>
                        <input
                            type="number"
                            value={metadata.recommendedWordCount}
                            onChange={(e) => handleChange('recommendedWordCount', parseInt(e.target.value) || 0)}
                            min="1000"
                            max="50000"
                        />
                    </div>
                </div>

                <div className="manager-actions">
                    <div className="left-actions">
                        <button 
                            onClick={() => setShowDeleteConfirm(true)} 
                            className="delete-btn"
                            title="Obriši ovaj dokument"
                        >
                            🗑️ Obriši dokument
                        </button>
                    </div>
                    <div className="right-actions">
                        <button onClick={onClose} className="cancel-btn">
                            Odustani
                        </button>
                        <button onClick={handleSave} className="save-btn">
                            Spremi promjene
                        </button>
                    </div>
                </div>
            </div>

            {}
            {showDeleteConfirm && (
                <div className="delete-confirm-overlay">
                    <div className="delete-confirm-modal">
                        <h3>⚠️ Potvrda brisanja</h3>
                        <p>
                            Jeste li sigurni da želite trajno obrisati dokument <strong>"{metadata.title || 'Bez naslova'}"</strong>?
                        </p>
                        <p className="warning-text">
                            Ova akcija će obrisati sav sadržaj uključujući sva poglavlja i ne može se poništiti!
                        </p>
                        <div className="confirm-buttons">
                            <button 
                                onClick={handleDelete}
                                className="confirm-delete-btn"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Brišem...' : '🗑️ Da, obriši trajno'}
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="cancel-delete-btn"
                                disabled={isDeleting}
                            >
                                Odustani
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentManager;
