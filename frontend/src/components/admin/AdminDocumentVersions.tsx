import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface Document {
  document_id: number;
  title: string;
  creator_name: string;
}

interface DocumentVersion {
  version_id: number;
  document_id: number;
  version_number: number;
  editor_name: string;
  edited_at: string;
  document_title: string;
  compiled_pdf_path: string | null;
}

type SortField = 'version_id' | 'document_id' | 'version_number' | 'edited_at' | 'document_title';
type SortDirection = 'asc' | 'desc' | null;

interface AdminDocumentVersionsProps {
  onClose: () => void;
}

export default function AdminDocumentVersions({ onClose }: AdminDocumentVersionsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField | null>('version_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery]);

  useEffect(() => {
    sortVersions();
  }, [versions, sortField, sortDirection]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDocument) {
          setSelectedDocument(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, selectedDocument]);

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
      const data = await api.getDocumentVersions(doc.document_id);
      setVersions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }

  function sortVersions() {
    if (!sortField || !sortDirection) {
      setFilteredVersions(versions);
      return;
    }

    const sorted = [...versions].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    setFilteredVersions(sorted);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return null;
    return (
      <span className="sort-indicator">
        {sortDirection === 'asc' ? '▲' : '▼'}
        <span className="sort-label">{sortDirection}</span>
      </span>
    );
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
          <h2>Document Versions</h2>
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
                                View Versions
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
              {/* Versions List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <button
                    onClick={() => setSelectedDocument(null)}
                    className="btn btn-secondary"
                    style={{ marginRight: '1rem' }}
                  >
                    ← Back to Documents
                  </button>
                  <h3 style={{ display: 'inline' }}>Versions for: {selectedDocument.title}</h3>
                </div>
              </div>

              {loading && <p>Loading versions...</p>}
              {error && <p className="error-message">{error}</p>}

              {!loading && !error && (
                <>
                  <p className="admin-result-count">
                    Total versions: {filteredVersions.length}
                  </p>
                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th className="sortable-header" onClick={() => handleSort('version_id')}>
                            <span className="sort-label">Version ID</span>
                            {getSortIcon('version_id')}
                          </th>
                          <th className="sortable-header" onClick={() => handleSort('version_number')}>
                            <span className="sort-label">Version #</span>
                            {getSortIcon('version_number')}
                          </th>
                          <th>Edited By</th>
                          <th className="sortable-header" onClick={() => handleSort('edited_at')}>
                            <span className="sort-label">Edited At</span>
                            {getSortIcon('edited_at')}
                          </th>
                          <th>PDF</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVersions.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                              No versions found for this document
                            </td>
                          </tr>
                        ) : (
                          filteredVersions.map(version => (
                            <tr key={version.version_id}>
                              <td>{version.version_id}</td>
                              <td>
                                <span className="version-badge">v{version.version_number}</span>
                              </td>
                              <td>{version.editor_name}</td>
                              <td>{formatDate(version.edited_at)}</td>
                              <td>{version.compiled_pdf_path ? '✓' : '-'}</td>
                              <td>
                                {version.compiled_pdf_path ? (
                                  <a
                                    href={api.downloadVersion(version.document_id, version.version_id)}
                                    className="btn btn-small admin-btn-secondary"
                                    download
                                  >
                                    Download PDF
                                  </a>
                                ) : (
                                  <span style={{ color: '#999' }}>No PDF</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="admin-modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
