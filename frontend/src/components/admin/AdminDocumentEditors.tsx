import { useState, useEffect } from 'react';
import api from '../../lib/api';
import ConfirmationBox from '../ConfirmationBox';

interface Document {
  document_id: number;
  title: string;
  creator_name: string;
}

interface DocumentEditor {
  user_id: number;
  user_name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer' | 'mentor';
  added_by: number;
  added_by_name: string;
  added_at: string;
}

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface AdminDocumentEditorsProps {
  onClose: () => void;
}

// Mini user selector component
function UserSelector({ onSelect }: { onSelect: (userId: number) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, query]);

  async function loadUsers() {
    try {
      const data = await api.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  function filterUsers() {
    if (!query.trim()) {
      setFilteredUsers(users);
      return;
    }
    const tokens = query.toLowerCase().trim().split(/\s+/);
    const filtered = users.filter(u => {
      const searchText = `${u.first_name} ${u.last_name} ${u.email} ${u.user_id}`.toLowerCase();
      return tokens.every(token => searchText.includes(token));
    });
    setFilteredUsers(filtered);
  }

  if (loading) return <p>Loading users...</p>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name, email, or ID..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="search-input"
        style={{ marginBottom: '1rem' }}
      />
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.user_id}>
                  <td>{u.user_id}</td>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <button
                      onClick={() => onSelect(u.user_id)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDocumentEditors({ onClose }: AdminDocumentEditorsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [editors, setEditors] = useState<DocumentEditor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  
  // Add editor
  const [showUserFinder, setShowUserFinder] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer' | 'mentor'>('editor');
  
  // Remove editor confirmation
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [editorToRemove, setEditorToRemove] = useState<DocumentEditor | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRemoveConfirm) {
          setShowRemoveConfirm(false);
        } else if (showUserFinder) {
          setShowUserFinder(false);
        } else if (selectedDocument) {
          setSelectedDocument(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, selectedDocument, showUserFinder, showRemoveConfirm]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAllDocuments();
      setDocuments(data.map((d: any) => ({
        document_id: d.document_id,
        title: d.title,
        creator_name: d.creator_name
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  function filterDocuments() {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const tokens = searchQuery.toLowerCase().trim().split(/\s+/);
    const filtered = documents.filter(doc => {
      const searchText = [doc.title, doc.creator_name, String(doc.document_id)]
        .join(' ')
        .toLowerCase();
      return tokens.every(token => searchText.includes(token));
    });
    setFilteredDocuments(filtered);
  }

  async function selectDocument(doc: Document) {
    setSelectedDocument(doc);
    setLoading(true);
    setError('');
    try {
      const data = await api.getDocumentEditors(doc.document_id);
      setEditors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load editors');
    } finally {
      setLoading(false);
    }
  }

  function openAddEditor() {
    setShowUserFinder(true);
  }

  async function handleUserSelected(userId: number) {
    if (!selectedDocument) return;

    try {
      await api.addDocumentEditor(selectedDocument.document_id, {
        user_id: userId,
        editor_role: selectedRole
      });
      setShowUserFinder(false);
      // Reload editors
      await selectDocument(selectedDocument);
    } catch (err: any) {
      setError(err.message || 'Failed to add editor');
    }
  }

  function openRemoveConfirmation(editor: DocumentEditor) {
    setEditorToRemove(editor);
    setShowRemoveConfirm(true);
  }

  async function handleRemoveEditor() {
    if (!selectedDocument || !editorToRemove) return;

    try {
      await api.removeDocumentEditor(selectedDocument.document_id, editorToRemove.user_id);
      setShowRemoveConfirm(false);
      setEditorToRemove(null);
      // Reload editors
      await selectDocument(selectedDocument);
    } catch (err: any) {
      setError(err.message || 'Failed to remove editor');
      setShowRemoveConfirm(false);
    }
  }

  function getRoleBadge(role: string) {
    const roleMap: Record<string, string> = {
      owner: 'Owner',
      editor: 'Editor',
      viewer: 'Viewer',
      mentor: 'Mentor'
    };
    return <span className={`role-badge role-${role}`}>{roleMap[role] || role}</span>;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('hr-HR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal-large" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Change Document Editors</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="admin-modal-body">
          {!selectedDocument ? (
            <>
              {/* Document Search */}
              <h3>Select a Document</h3>
              <div className="search-filter-container">
                <input
                  type="text"
                  placeholder="Search by document ID, title, or creator..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              {loading && <p>Loading documents...</p>}
              {error && <p className="error-message">{error}</p>}

              {!loading && !error && (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Creator</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                            No documents found
                          </td>
                        </tr>
                      ) : (
                        filteredDocuments.map(doc => (
                          <tr key={doc.document_id}>
                            <td>{doc.document_id}</td>
                            <td>{doc.title}</td>
                            <td>{doc.creator_name}</td>
                            <td>
                              <button
                                onClick={() => selectDocument(doc)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                              >
                                Manage Editors
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Editor Management */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <button
                    onClick={() => setSelectedDocument(null)}
                    className="btn btn-secondary"
                    style={{ marginRight: '1rem' }}
                  >
                    ← Back to Documents
                  </button>
                  <h3 style={{ display: 'inline' }}>Editors for: {selectedDocument.title}</h3>
                </div>
              </div>

              <div className="admin-actions">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value as any)}
                    style={{ 
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                    <option value="mentor">Mentor</option>
                  </select>
                  <button onClick={openAddEditor} className="btn btn-primary">
                    + Add Editor
                  </button>
                </div>
              </div>

              {loading && <p>Loading editors...</p>}
              {error && <p className="error-message">{error}</p>}

              {!loading && !error && (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Added By</th>
                        <th>Added At</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editors.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                            No editors found for this document
                          </td>
                        </tr>
                      ) : (
                        editors.map(editor => (
                          <tr key={editor.user_id}>
                            <td>{editor.user_id}</td>
                            <td>{editor.user_name}</td>
                            <td>{editor.email}</td>
                            <td>{getRoleBadge(editor.role)}</td>
                            <td>{editor.added_by_name || 'N/A'}</td>
                            <td>{formatDate(editor.added_at)}</td>
                            <td>
                              {editor.role !== 'owner' ? (
                                <button
                                  onClick={() => openRemoveConfirmation(editor)}
                                  className="btn btn-danger"
                                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                >
                                  Remove
                                </button>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                                  Cannot remove owner
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Finder Modal */}
      {showUserFinder && (
        <div className="admin-modal-overlay" onClick={(e) => { e.stopPropagation(); setShowUserFinder(false); }}>
          <div className="admin-modal admin-modal-form" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Select User to Add as {selectedRole}</h2>
              <button onClick={() => setShowUserFinder(false)} className="close-btn">&times;</button>
            </div>
            <div className="admin-modal-body">
              <UserSelector onSelect={handleUserSelected} />
            </div>
            <div className="admin-form-actions">
              <button onClick={() => setShowUserFinder(false)} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation */}
      <div onClick={e => e.stopPropagation()}>
        {showRemoveConfirm && editorToRemove && (
          <ConfirmationBox
            title="Remove Editor"
            question={`Are you sure you want to remove ${editorToRemove.user_name} (${editorToRemove.role}) from this document?`}
            isOpen={showRemoveConfirm}
            onConfirm={handleRemoveEditor}
            onCancel={() => setShowRemoveConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
