import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import DocumentsManager from '../components/DocumentsManager';
import './AdminPanel.css';

const AdminPanel = ({ user, onNavigateHome }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, user: null });
    const [showPasswords, setShowPasswords] = useState({});
    
    const [formData, setFormData] = useState({
        ime: '',
        prezime: '',
        username: '',
        password: '',
        email: '',
        brojTelefona: '',
        sveuciliste: '',
        fakultet: '',
        smjer: '',
        opis: ''
    });

    const [newPassword, setNewPassword] = useState('');
    const [notification, setNotification] = useState(null);
    useEffect(() => {
        fetchUsers();
    }, []);
    useEffect(() => {
        const isModalOpen = isEditModalOpen || isAddModalOpen || isPasswordModalOpen || isDocumentsModalOpen || deleteConfirm.show;
        
        if (isModalOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isEditModalOpen, isAddModalOpen, isPasswordModalOpen, isDocumentsModalOpen, deleteConfirm.show]);
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    user.ime?.toLowerCase().includes(searchLower) ||
                    user.prezime?.toLowerCase().includes(searchLower) ||
                    user.username?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.brojTelefona?.toLowerCase().includes(searchLower) ||
                    user.sveuciliste?.toLowerCase().includes(searchLower) ||
                    user.fakultet?.toLowerCase().includes(searchLower) ||
                    user.smjer?.toLowerCase().includes(searchLower) ||
                    user.opis?.toLowerCase().includes(searchLower)
                );
            });
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                setUsers(result.data);
            } else {
                showNotification('Greška pri dohvaćanju korisnika: ' + result.message, 'error');
            }
        } catch (error) {
            showNotification('Greška pri dohvaćanju korisnika', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
    };

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setFormData({
            ime: user.ime || '',
            prezime: user.prezime || '',
            username: user.username || '',
            password: user.password || '',
            email: user.email || '',
            brojTelefona: user.brojTelefona || '',
            sveuciliste: user.sveuciliste || '',
            fakultet: user.fakultet || '',
            smjer: user.smjer || '',
            opis: user.opis || ''
        });
        setIsEditModalOpen(true);
    };

    const handleAddUser = () => {
        setFormData({
            ime: '',
            prezime: '',
            username: '',
            password: '',
            email: '',
            brojTelefona: '',
            sveuciliste: '',
            fakultet: '',
            smjer: '',
            opis: ''
        });
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const url = selectedUser ? `/api/users/${selectedUser.id}` : '/api/users';
            const method = selectedUser ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                await fetchUsers();
                setIsEditModalOpen(false);
                setIsAddModalOpen(false);
                setSelectedUser(null);
                showNotification(selectedUser ? 'Korisnik uspješno ažuriran!' : 'Korisnik uspješno dodan!', 'success');
                if (selectedUser) {
                    window.dispatchEvent(new CustomEvent('userUpdated', {
                        detail: { 
                            userId: selectedUser.id,
                            oldUsername: selectedUser.username,
                            newUsername: formData.username
                        }
                    }));
                }
            } else {
                showNotification('Greška: ' + result.message, 'error');
            }
        } catch (error) {
            showNotification('Greška pri spremanju korisnika', 'error');
        }
    };

    const handleDeleteUser = async (userToDelete) => {
        try {
            const response = await fetch(`/api/users/${userToDelete.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();
            
            if (result.success) {
                await fetchUsers();
                setDeleteConfirm({ show: false, user: null });
                showNotification('Korisnik uspješno obrisan!', 'success');
            } else {
                showNotification('Greška: ' + result.message, 'error');
            }
        } catch (error) {
            showNotification('Greška pri brisanju korisnika', 'error');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (!newPassword || newPassword.length < 4) {
            showNotification('Nova lozinka mora imati najmanje 4 znakova', 'error');
            return;
        }

        try {
            const response = await fetch('/api/users/change-admin-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ newPassword })
            });

            const result = await response.json();
            
            if (result.success) {
                showNotification('Lozinka je uspješno promijenjena', 'success');
                setIsPasswordModalOpen(false);
                setNewPassword('');
            } else {
                showNotification('Greška: ' + result.message, 'error');
            }
        } catch (error) {
            showNotification('Greška pri promjeni lozinke', 'error');
        }
    };

    const togglePasswordVisibility = (userId) => {
        setShowPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    };

    if (loading) {
        return (
            <div className="admin-panel">
                <div className="loading">Učitava korisnike...</div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            {/* Admin Header */}
            <header className="admin-header">
                <div className="admin-header-left">
                    <button 
                        className="btn-back"
                        onClick={onNavigateHome}
                    >
                        ← Povratak na glavnu stranicu
                    </button>
                    <button 
                        className="btn-add-user"
                        onClick={handleAddUser}
                    >
                        Dodaj korisnika
                    </button>
                </div>
                
                <div className="admin-header-center">
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Pretraži korisnike..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <button 
                            className="search-btn"
                            onClick={handleSearch}
                        >
                            <img src="/icons/search.png" alt="Pretraži" />
                        </button>
                    </div>
                </div>
                
                <div className="admin-header-right">
                    <button 
                        className="btn-documents"
                        onClick={() => setIsDocumentsModalOpen(true)}
                    >
                        Dokumenti
                    </button>
                    <button 
                        className="btn-change-password"
                        onClick={() => setIsPasswordModalOpen(true)}
                    >
                        Promijeni Admin Lozinku
                    </button>
                </div>
            </header>

            {/* Glavni sadržaj */}
            <main className="admin-main">
                <div className="users-grid">
                    {filteredUsers.map(user => (
                        <div 
                            key={user.id} 
                            className="user-card"
                            onClick={() => handleUserClick(user)}
                        >
                            <div className="user-card-header">
                                <h3>{user.ime} {user.prezime}</h3>
                                {user.role !== 'admin' && (
                                    <button
                                        className="btn-delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm({ show: true, user });
                                        }}
                                    >
                                        <img src="/icons/delete.png" alt="Obriši" />
                                    </button>
                                )}
                            </div>
                            <div className="user-card-body">
                                <p><strong>Korisničko ime:</strong> {user.username}</p>
                                <p>
                                    <strong>Lozinka:</strong> 
                                    <span className="password-field">
                                        {showPasswords[user.id] ? user.password : '••••••••'}
                                        <button
                                            className="btn-toggle-password"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePasswordVisibility(user.id);
                                            }}
                                        >
                                            {showPasswords[user.id] ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </span>
                                </p>
                                {user.email && <p><strong>Email:</strong> {user.email}</p>}
                                {user.role === 'admin' && <span className="admin-badge">ADMIN</span>}
                            </div>
                        </div>
                    ))}
                </div>
                
                {filteredUsers.length === 0 && (
                    <div className="no-users">
                        {searchTerm ? 'Nema korisnika koji odgovaraju pretrazi.' : 'Nema korisnika.'}
                    </div>
                )}
            </main>

            {/* Edit/Add User Modal */}
            {(isEditModalOpen || isAddModalOpen) && (
                <div className="modal-overlay">
                    <div className="modal-content user-form-modal">
                        <h2>{selectedUser ? 'Uredi korisnika' : 'Dodaj novog korisnika'}</h2>
                        <form onSubmit={handleFormSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Ime *</label>
                                    <input
                                        type="text"
                                        value={formData.ime}
                                        onChange={(e) => setFormData({...formData, ime: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Prezime *</label>
                                    <input
                                        type="text"
                                        value={formData.prezime}
                                        onChange={(e) => setFormData({...formData, prezime: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Korisničko ime *</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Lozinka *</label>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        required={!selectedUser}
                                        placeholder={selectedUser ? "Ostavite prazno da ne mijenjate lozinku" : "Unesite lozinku"}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Broj telefona</label>
                                    <input
                                        type="tel"
                                        value={formData.brojTelefona}
                                        onChange={(e) => setFormData({...formData, brojTelefona: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Sveučilište</label>
                                    <input
                                        type="text"
                                        value={formData.sveuciliste}
                                        onChange={(e) => setFormData({...formData, sveuciliste: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fakultet</label>
                                    <input
                                        type="text"
                                        value={formData.fakultet}
                                        onChange={(e) => setFormData({...formData, fakultet: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Smjer na fakultetu</label>
                                    <input
                                        type="text"
                                        value={formData.smjer}
                                        onChange={(e) => setFormData({...formData, smjer: e.target.value})}
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Opis</label>
                                    <textarea
                                        value={formData.opis}
                                        onChange={(e) => setFormData({...formData, opis: e.target.value})}
                                        rows="3"
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setIsAddModalOpen(false);
                                        setSelectedUser(null);
                                    }}
                                >
                                    Odustani
                                </button>
                                <button type="submit" className="btn-save">
                                    {selectedUser ? 'Spremi promjene' : 'Dodaj korisnika'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content password-modal">
                        <h2>Promijeni Admin Lozinku</h2>
                        <form onSubmit={handleChangePassword}>
                            <div className="form-group">
                                <label>Nova lozinka</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength="4"
                                />
                            </div>
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => {
                                        setIsPasswordModalOpen(false);
                                        setNewPassword('');
                                    }}
                                >
                                    Odustani
                                </button>
                                <button type="submit" className="btn-save">
                                    Promijeni lozinku
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Documents Manager */}
            <DocumentsManager 
                isOpen={isDocumentsModalOpen}
                onClose={() => setIsDocumentsModalOpen(false)}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.show}
                title="Potvrdi brisanje"
                message={`Jeste li sigurni da želite obrisati korisnika "${deleteConfirm.user?.ime} ${deleteConfirm.user?.prezime}" (${deleteConfirm.user?.username})?`}
                onConfirm={() => handleDeleteUser(deleteConfirm.user)}
                onClose={() => setDeleteConfirm({ show: false, user: null })}
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
        </div>
    );
};

export default AdminPanel;