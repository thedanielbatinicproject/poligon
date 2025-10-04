import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import './DocumentsManager.css';

const DocumentsManager = ({ isOpen, onClose }) => {
    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [documentDetails, setDocumentDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    // Search i pagination za dokumente
    const [documentSearch, setDocumentSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    
    // Add user modal
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    
    // Delete confirmations
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, data: null });
    
    const [notification, setNotification] = useState(null);

    // Učitaj dokumente s paginacijom
    const fetchDocuments = async (page = 1, search = '') => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/documents?page=${page}&limit=10&search=${encodeURIComponent(search)}`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                setDocuments(result.data.documents);
                setPagination(result.data.pagination);
            } else {
                showNotification('Greška pri dohvaćanju dokumenata: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            showNotification('Greška pri dohvaćanju dokumenata', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Učitaj korisnike koji mogu biti editori (bez admin korisnika)
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/documents/users/available', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                setUsers(result.data);
                setFilteredUsers(result.data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // Učitaj detalje o dokumentu s editorima
    const fetchDocumentDetails = async (documentId) => {
        try {
            setLoadingDetails(true);
            const response = await fetch(`/api/admin/documents/${documentId}`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                setDocumentDetails(result.data);
            } else {
                showNotification('Greška pri dohvaćanju detalja dokumenta: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error fetching document details:', error);
            showNotification('Greška pri dohvaćanju detalja dokumenta', 'error');
        } finally {
            setLoadingDetails(false);
        }
    };

    // Dodaj korisnika kao editor-a
    const addEditor = async (username) => {
        try {
            const response = await fetch(`/api/admin/documents/${selectedDocument}/editors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Editor uspješno dodan!', 'success');
                fetchDocumentDetails(selectedDocument); // Refresh detalja
                setShowAddUserModal(false);
            } else {
                showNotification('Greška: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error adding editor:', error);
            showNotification('Greška pri dodavanju editora', 'error');
        }
    };

    // Ukloni editor-a
    const removeEditor = async (username) => {
        try {
            const response = await fetch(`/api/admin/documents/${selectedDocument}/editors/${username}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Editor uspješno uklonjen!', 'success');
                fetchDocumentDetails(selectedDocument); // Refresh detalja
                setDeleteConfirm({ show: false, type: null, data: null });
            } else {
                showNotification('Greška: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error removing editor:', error);
            showNotification('Greška pri uklanjanju editora', 'error');
        }
    };

    // Obriši dokument
    const deleteDocument = async (documentId) => {
        try {
            const response = await fetch(`/api/admin/documents/${documentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Dokument uspješno obrisan!', 'success');
                fetchDocuments(currentPage, documentSearch); // Refresh liste
                setSelectedDocument(null);
                setDocumentDetails(null);
                setDeleteConfirm({ show: false, type: null, data: null });
            } else {
                showNotification('Greška: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            showNotification('Greška pri brisanju dokumenta', 'error');
        }
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    };

    const handleDocumentSearch = () => {
        setCurrentPage(1);
        fetchDocuments(1, documentSearch);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchDocuments(newPage, documentSearch);
    };

    const handleDocumentSelect = (document) => {
        setSelectedDocument(document.id);
        fetchDocumentDetails(document.id);
    };

    const handleUserSearch = (searchTerm) => {
        setUserSearch(searchTerm);
        if (!searchTerm.trim()) {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user => 
                user.ime?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.prezime?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    };

    // Load initial data
    useEffect(() => {
        if (isOpen) {
            fetchDocuments();
            fetchUsers();
        }
    }, [isOpen]);

    // Reset search when document search changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (documentSearch !== '') {
                handleDocumentSearch();
            }
        }, 500);
        
        return () => clearTimeout(timeoutId);
    }, [documentSearch]);

    if (!isOpen) return null;

    return (
        <>
            <div className="documents-manager-overlay">
                <div className="documents-manager-modal">
                    <div className="documents-manager-header">
                        <h2>Upravljanje dokumentima</h2>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>

                    {/* GORNJA POLOVICA - DOKUMENTI */}
                    <div className="documents-section">
                        <div className="section-header">
                            <h3>Dokumenti</h3>
                            <div className="search-controls">
                                <input
                                    type="text"
                                    placeholder="Pretraži po naslovu ili autoru..."
                                    value={documentSearch}
                                    onChange={(e) => setDocumentSearch(e.target.value)}
                                    className="search-input"
                                />
                                <button onClick={handleDocumentSearch} className="search-btn">
                                    <img src="/icons/search.png" alt="Pretraži" />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading">Učitava dokumente...</div>
                        ) : (
                            <>
                                <div className="documents-grid">
                                    {documents.map(doc => (
                                        <div 
                                            key={doc.id} 
                                            className={`document-card ${selectedDocument === doc.id ? 'selected' : ''}`}
                                            onClick={() => handleDocumentSelect(doc)}
                                        >
                                            <div className="document-card-header">
                                                <h4>{doc.metadata?.title || 'Bez naslova'}</h4>
                                                <button
                                                    className="btn-delete-doc"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm({
                                                            show: true,
                                                            type: 'document',
                                                            data: { id: doc.id, title: doc.metadata?.title }
                                                        });
                                                    }}
                                                >
                                                    <img src="/icons/delete.png" alt="Obriši" />
                                                </button>
                                            </div>
                                            <div className="document-card-body">
                                                <p><strong>Autor:</strong> {doc.creatorInfo?.ime} {doc.creatorInfo?.prezime}</p>
                                                <p><strong>Username:</strong> {doc.creatorInfo?.username}</p>
                                                <p><strong>Ažurirano:</strong> {new Date(doc.updated).toLocaleDateString('hr-HR')}</p>
                                                <p><strong>Editori:</strong> {doc.editors?.length || 0}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {pagination && pagination.totalPages > 1 && (
                                    <div className="pagination">
                                        <button 
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={!pagination.hasPrev}
                                            className="pagination-btn"
                                        >
                                            ‹ Prethodna
                                        </button>
                                        <span className="pagination-info">
                                            Stranica {pagination.currentPage} od {pagination.totalPages}
                                        </span>
                                        <button 
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={!pagination.hasNext}
                                            className="pagination-btn"
                                        >
                                            Sljedeća ›
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* DONJA POLOVICA - KORISNICI */}
                    <div className="users-section">
                        <div className="section-header">
                            <h3>
                                {selectedDocument ? 'Korisnici s pristupom dokumentu' : 'Svi korisnici'}
                            </h3>
                            {selectedDocument && (
                                <button 
                                    className="btn-add-user"
                                    onClick={() => setShowAddUserModal(true)}
                                >
                                    + Dodaj korisnika
                                </button>
                            )}
                        </div>

                        {loadingDetails ? (
                            <div className="loading">Učitava korisnike...</div>
                        ) : selectedDocument && documentDetails ? (
                            <div className="document-users">
                                {/* Kreator */}
                                {documentDetails.creatorInfo && (
                                    <div className="user-item creator">
                                        <div className="user-info">
                                            <h4>{documentDetails.creatorInfo.ime} {documentDetails.creatorInfo.prezime}</h4>
                                            <p>@{documentDetails.creatorInfo.username}</p>
                                            <p>{documentDetails.creatorInfo.email}</p>
                                        </div>
                                        <div className="user-role">
                                            <span className="role-badge creator">KREATOR</span>
                                        </div>
                                    </div>
                                )}

                                {/* Editeri */}
                                {documentDetails.editorsInfo?.map(editor => (
                                    <div key={editor.id} className="user-item editor">
                                        <div className="user-info">
                                            <h4>{editor.ime} {editor.prezime}</h4>
                                            <p>@{editor.username}</p>
                                            <p>{editor.email}</p>
                                        </div>
                                        <div className="user-actions">
                                            <span className="role-badge editor">EDITOR</span>
                                            <button
                                                className="btn-remove-editor"
                                                onClick={() => setDeleteConfirm({
                                                    show: true,
                                                    type: 'editor',
                                                    data: { username: editor.username, name: `${editor.ime} ${editor.prezime}` }
                                                })}
                                            >
                                                <img src="/icons/delete.png" alt="Ukloni" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {(!documentDetails.editorsInfo || documentDetails.editorsInfo.length === 0) && (
                                    <p className="no-editors">Nema dodatnih editora.</p>
                                )}
                            </div>
                        ) : (
                            <div className="no-selection">
                                <p>Odaberite dokument da vidite povezane korisnike.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="add-user-modal-overlay">
                    <div className="add-user-modal">
                        <div className="modal-header">
                            <h3>Dodaj korisnika u dokument</h3>
                            <button className="close-btn" onClick={() => setShowAddUserModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <input
                                type="text"
                                placeholder="Pretraži korisnike..."
                                value={userSearch}
                                onChange={(e) => handleUserSearch(e.target.value)}
                                className="user-search-input"
                            />
                            
                            <div className="users-list">
                                {filteredUsers.map(user => (
                                    <div key={user.id} className="user-option">
                                        <div className="user-info">
                                            <h4>{user.ime} {user.prezime}</h4>
                                            <p>@{user.username}</p>
                                            <p>{user.email}</p>
                                        </div>
                                        <button
                                            className="btn-add"
                                            onClick={() => addEditor(user.username)}
                                        >
                                            Dodaj
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.show}
                title={deleteConfirm.type === 'document' ? 'Potvrdi brisanje dokumenta' : 'Potvrdi uklanjanje editora'}
                message={
                    deleteConfirm.type === 'document' 
                        ? `Jeste li sigurni da želite obrisati dokument "${deleteConfirm.data?.title}"? Ova akcija se ne može poništiti.`
                        : `Jeste li sigurni da želite ukloniti korisnika "${deleteConfirm.data?.name}" kao editora?`
                }
                onConfirm={() => {
                    if (deleteConfirm.type === 'document') {
                        deleteDocument(deleteConfirm.data.id);
                    } else {
                        removeEditor(deleteConfirm.data.username);
                    }
                }}
                onClose={() => setDeleteConfirm({ show: false, type: null, data: null })}
                type="danger"
            />

            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    <div className="notification-content">
                        <span className="notification-message">{notification.message}</span>
                        <button 
                            className="notification-close"
                            onClick={() => setNotification(null)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default DocumentsManager;