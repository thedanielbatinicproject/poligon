import { useState, useEffect } from 'react';
import api from '../../lib/api';
import ConfirmationBox from '../ConfirmationBox';

interface DocumentType {
  type_id: number;
  type_name: string;
  description: string;
}

interface AdminDocumentTypesProps {
  onClose: () => void;
}

export default function AdminDocumentTypes({ onClose }: AdminDocumentTypesProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create/Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState({ type_name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<DocumentType | null>(null);

  useEffect(() => {
    loadDocumentTypes();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (showForm) {
          setShowForm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showForm, showDeleteConfirm]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  async function loadDocumentTypes() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAllDocumentTypes();
      setDocumentTypes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load document types');
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingType(null);
    setFormData({ type_name: '', description: '' });
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(type: DocumentType) {
    setEditingType(type);
    setFormData({ type_name: type.type_name, description: type.description });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.type_name.trim()) {
      setFormError('Type name is required');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingType) {
        await api.updateDocumentType(editingType.type_id, formData);
      } else {
        await api.createDocumentType(formData);
      }
      await loadDocumentTypes();
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save document type');
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteConfirmation(type: DocumentType) {
    setTypeToDelete(type);
    setShowDeleteConfirm(true);
  }

  async function handleDelete() {
    if (!typeToDelete) return;
    
    try {
      await api.deleteDocumentType(typeToDelete.type_id);
      await loadDocumentTypes();
      setShowDeleteConfirm(false);
      setTypeToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document type');
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal-form" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Document Types</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="admin-modal-body">
          {loading && <p>Loading document types...</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <>
              <div className="admin-actions">
                <button onClick={openCreateForm} className="btn btn-primary">
                  + Add New Type
                </button>
                <button onClick={loadDocumentTypes} className="btn btn-secondary">
                  Refresh
                </button>
              </div>

              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type Name</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentTypes.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                          No document types found
                        </td>
                      </tr>
                    ) : (
                      documentTypes.map(type => (
                        <tr key={type.type_id}>
                          <td>{type.type_id}</td>
                          <td><strong>{type.type_name}</strong></td>
                          <td>{type.description}</td>
                          <td>
                            <button
                              onClick={() => openEditForm(type)}
                              className="btn btn-secondary"
                              style={{ minWidth: '80px', marginRight: '0.75rem' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteConfirmation(type)}
                              className="btn btn-danger"
                              style={{ minWidth: '80px' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={(e) => { e.stopPropagation(); setShowForm(false); }}>
          <div className="admin-modal admin-modal-form" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingType ? 'Edit Document Type' : 'Create Document Type'}</h2>
              <button onClick={() => setShowForm(false)} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="admin-modal-body">
                {formError && <p className="error-message">{formError}</p>}

                <div className="admin-form-section">
                  <label htmlFor="type_name">Type Name *</label>
                  <input
                    id="type_name"
                    type="text"
                    value={formData.type_name}
                    onChange={e => setFormData({ ...formData, type_name: e.target.value })}
                    placeholder="e.g., thesis, report, seminar"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="admin-form-section">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this document type"
                    rows={4}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-ghost"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (editingType ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <div onClick={e => e.stopPropagation()}>
        {showDeleteConfirm && typeToDelete && (
          <ConfirmationBox
            title="Delete Document Type"
            question={`Are you sure you want to delete document type "${typeToDelete.type_name}"? This will set type_id to NULL for all documents using this type.`}
            isOpen={showDeleteConfirm}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
