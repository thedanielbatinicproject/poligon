import { useState, useEffect } from 'react';
import api from '../../lib/api';
import WorkflowHistoryModal from '../WorkflowHistoryModal';
import * as TasksApi from '../../lib/tasksApi';

interface Document {
  document_id: number;
  title: string;
  status: 'draft' | 'submitted' | 'under_review' | 'finished' | 'graded';
  language: 'hr' | 'en';
  grade: number | null;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_email: string;
  type_name: string;
  mentor_names: string | null;
}

interface DocumentType {
  type_id: number;
  type_name: string;
  description: string;
}

type SortField = 'document_id' | 'title' | 'status' | 'language' | 'grade' | 'created_at' | 'updated_at' | 'creator_name' | 'type_name';
type SortDirection = 'asc' | 'desc' | null;

interface AdminDocumentBrowserProps {
  onClose: () => void;
}

export default function AdminDocumentBrowser({ onClose }: AdminDocumentBrowserProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Workflow History Modal
  const [showWorkflowHistory, setShowWorkflowHistory] = useState(false);
  const [workflowDocumentId, setWorkflowDocumentId] = useState<number | null>(null);
  const [usersMap, setUsersMap] = useState<Record<number, string>>({});
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    loadDocuments();
    loadDocumentTypes();
    loadUsersMap();
  }, []);

  useEffect(() => {
    filterAndSortDocuments();
  }, [documents, statusFilter, languageFilter, typeFilter, searchQuery, sortField, sortDirection]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function loadDocumentTypes() {
    try {
      const data = await api.getAllDocumentTypes();
      setDocumentTypes(data);
    } catch (err: any) {
      console.error('Failed to load document types:', err);
    }
  }

  async function loadUsersMap() {
    try {
      const list = await TasksApi.getReducedUsers();
      if (!Array.isArray(list)) return;
      const map: Record<number, string> = {};
      for (const u of list) {
        const id = Number(u.user_id ?? u.id ?? u.userId ?? 0);
        if (!id) continue;
        const name = (u.display_name && String(u.display_name).trim()) || 
                     `${(u.first_name ?? u.firstName ?? '').trim()} ${(u.last_name ?? u.lastName ?? '').trim()}`.trim() || 
                     (u.email ?? '') || 
                     String(id);
        map[id] = name;
      }
      setUsersMap(map);
    } catch (err) {
      console.error('Failed to load users map:', err);
    }
  }

  function filterAndSortDocuments() {
    let result = [...documents];

    // Apply status filter
    if (statusFilter) {
      result = result.filter(doc => doc.status === statusFilter);
    }

    // Apply language filter
    if (languageFilter) {
      result = result.filter(doc => doc.language === languageFilter);
    }

    // Apply type filter
    if (typeFilter) {
      const selectedType = documentTypes.find(t => t.type_id.toString() === typeFilter);
      if (selectedType) {
        result = result.filter(doc => doc.type_name === selectedType.type_name);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/);
      result = result.filter(doc => {
        const searchText = [
          doc.title,
          doc.creator_name,
          doc.type_name,
          doc.mentor_names,
          doc.status
        ].filter(Boolean).join(' ').toLowerCase();
        return tokens.every(token => searchText.includes(token));
      });
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle null values
        if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;
        
        // String comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        
        // Number comparison
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
    }

    setFilteredDocuments(result);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      // Cycle through: asc -> desc -> none
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

  function getStatusBadge(status: string) {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under Review',
      finished: 'Finished',
      graded: 'Graded'
    };
    return <span className={`status-badge status-${status}`}>{statusMap[status] || status}</span>;
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
          <h2>All Documents</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="admin-modal-body">
          {/* Search */}
          <div className="search-filter-container">
            <input
              type="text"
              placeholder="Search by title, creator, type, mentor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="filter-info">
              Showing {filteredDocuments.length} of {documents.length} documents
            </div>
          </div>

          {loading && <p>Loading documents...</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('document_id')} className="sortable-header">
                        ID {getSortIcon('document_id')}
                      </th>
                      <th onClick={() => handleSort('title')} className="sortable-header">
                        Title {getSortIcon('title')}
                      </th>
                      <th>
                        Type
                        <select
                          value={typeFilter}
                          onChange={e => setTypeFilter(e.target.value)}
                          className="column-filter"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">All Types</option>
                          {documentTypes.map(type => (
                            <option key={type.type_id} value={type.type_id.toString()}>
                              {type.type_name}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th>
                        Status
                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="column-filter"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">All Statuses</option>
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="finished">Finished</option>
                          <option value="graded">Graded</option>
                        </select>
                      </th>
                      <th>
                        Language
                        <select
                          value={languageFilter}
                          onChange={e => setLanguageFilter(e.target.value)}
                          className="column-filter"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">All</option>
                          <option value="hr">HR</option>
                          <option value="en">EN</option>
                        </select>
                      </th>
                      <th onClick={() => handleSort('grade')} className="sortable-header">
                        Grade {getSortIcon('grade')}
                      </th>
                      <th onClick={() => handleSort('creator_name')} className="sortable-header">
                        Creator {getSortIcon('creator_name')}
                      </th>
                      <th>Mentors</th>
                      <th onClick={() => handleSort('updated_at')} className="sortable-header">
                        Updated {getSortIcon('updated_at')}
                      </th>
                      <th>Workflow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                          No documents found
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map(doc => (
                        <tr key={doc.document_id}>
                          <td>{doc.document_id}</td>
                          <td title={doc.title}>{doc.title}</td>
                          <td>{doc.type_name || 'N/A'}</td>
                          <td>{getStatusBadge(doc.status)}</td>
                          <td>{doc.language ? doc.language.toUpperCase() : '-'}</td>
                          <td>{doc.grade !== null ? doc.grade : '-'}</td>
                          <td title={doc.creator_email}>{doc.creator_name || '-'}</td>
                          <td>{doc.mentor_names || '-'}</td>
                          <td>{formatDate(doc.updated_at)}</td>
                          <td>
                            <button
                              onClick={() => {
                                setWorkflowDocumentId(doc.document_id);
                                setShowWorkflowHistory(true);
                              }}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                            >
                              SEE WORKFLOW HISTORY
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

      {/* Workflow History Modal */}
      <WorkflowHistoryModal
        open={showWorkflowHistory}
        onClose={() => {
          setShowWorkflowHistory(false);
          setWorkflowDocumentId(null);
        }}
        documentId={workflowDocumentId}
        usersMap={usersMap}
      />
    </div>
  );
}
