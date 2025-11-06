import { useState, useEffect } from 'react';
import api from '../../lib/api';
import ConfirmationBox from '../ConfirmationBox';

interface Document {
  document_id: number;
  title: string;
  creator_name: string;
}

interface FileUpload {
  file_id: number;
  file_name: string;
  file_type: 'image' | 'pdf' | 'bib' | 'tex';
  file_size: number;
  uploaded_at: string;
  uploaded_by: number;
  uploader_name: string;
}

interface AdminFileManagerProps {
  onClose: () => void;
}

export default function AdminFileManager({ onClose }: AdminFileManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  
  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'document'>('image');
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileUpload | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (selectedDocument) {
          setSelectedDocument(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, selectedDocument, showDeleteConfirm]);

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
      const data = await api.getDocumentFiles(doc.document_id);
      setFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !selectedDocument) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setError('');
    
    try {
      if (uploadType === 'image') {
        await api.uploadImage(selectedDocument.document_id, file);
      } else {
        await api.uploadDocument(selectedDocument.document_id, file);
      }
      // Reload files
      await selectDocument(selectedDocument);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  }

  function openDeleteConfirmation(file: FileUpload) {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  }

  async function handleDeleteFile() {
    if (!fileToDelete || !selectedDocument) return;

    try {
      await api.deleteFile(fileToDelete.file_id);
      setShowDeleteConfirm(false);
      setFileToDelete(null);
      // Reload files
      await selectDocument(selectedDocument);
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
      setShowDeleteConfirm(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (!bytes || isNaN(bytes)) return 'empty';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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

  function getFileTypeIcon(fileType: string): string {
    const icons: Record<string, string> = {
      image: 'IMG',
      pdf: 'PDF',
      bib: 'BIB',
      tex: 'TEX'
    };
    return icons[fileType] || 'FILE';
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal-large" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Storage Management</h2>
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
                                className="btn btn-small admin-btn-primary"
                              >
                                Manage Files
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
              {/* File Management */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <button
                    onClick={() => setSelectedDocument(null)}
                    className="btn btn-secondary"
                    style={{ marginRight: '1rem' }}
                  >
                    ← Back to Documents
                  </button>
                  <h3 style={{ display: 'inline' }}>Files for: {selectedDocument.title}</h3>
                </div>
              </div>

              <div className="admin-actions" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select
                    value={uploadType}
                    onChange={e => setUploadType(e.target.value as 'image' | 'document')}
                    className="admin-filter-select"
                    disabled={uploading}
                  >
                    <option value="image">Image (PNG, JPG, GIF)</option>
                    <option value="document">Document (PDF, BIB, TEX)</option>
                  </select>
                  <label className="btn btn-primary" style={{ margin: 0 }}>
                    {uploading ? 'Uploading...' : '+ Upload File'}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      disabled={uploading}
                      accept={uploadType === 'image' ? 'image/*' : '.pdf,.bib,.tex'}
                    />
                  </label>
                </div>
              </div>

              {loading && <p>Loading files...</p>}
              {error && <p className="error-message">{error}</p>}

              {!loading && !error && (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>Uploaded By</th>
                        <th>Uploaded At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                            No files found for this document
                          </td>
                        </tr>
                      ) : (
                        files.map(file => (
                          <tr key={file.file_id}>
                            <td>{file.file_id}</td>
                            <td>
                              <span title={file.file_type}>
                                {getFileTypeIcon(file.file_type)}
                              </span>
                            </td>
                            <td>{file.file_name}</td>
                            <td>{formatFileSize(file.file_size)}</td>
                            <td>{file.uploader_name}</td>
                            <td>{formatDate(file.uploaded_at)}</td>
                            <td>
                              <a
                                href={api.downloadFile(file.file_id)}
                                className="btn btn-small admin-btn-secondary"
                                style={{ marginRight: '0.5rem' }}
                                download
                              >
                                Download
                              </a>
                              <button
                                onClick={() => openDeleteConfirmation(file)}
                                className="btn btn-small admin-btn-danger"
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <div onClick={e => e.stopPropagation()}>
        {showDeleteConfirm && fileToDelete && (
          <ConfirmationBox
            title="Delete File"
            question={`Are you sure you want to delete "${fileToDelete.file_name}"? This action cannot be undone.`}
            isOpen={showDeleteConfirm}
            onConfirm={handleDeleteFile}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
