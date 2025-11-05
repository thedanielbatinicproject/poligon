import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as DocumentsApi from '../lib/documentsApi';
import { useNotifications } from '../lib/notifications';

interface Document {
  document_id: number;
  type_id: number;
  title: string;
  abstract: string;
  status: string;
  grade: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface DocumentType {
  type_id: number;
  type_name: string;
}

interface Editor {
  user_id: number;
  role: string;
}

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
}

interface DocumentFinderProps {
  open: boolean;
  onClose: () => void;
  onSelect: (documentId: number) => void;
}

const DocumentFinder: React.FC<DocumentFinderProps> = ({ open, onClose, onSelect }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentTypes, setDocumentTypes] = useState<Record<number, string>>({});
  const [editorsMap, setEditorsMap] = useState<Record<number, string[]>>({});
  const [usersMap, setUsersMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [showAllEditorsFor, setShowAllEditorsFor] = useState<Record<number, boolean>>({});
  const { push } = useNotifications();

  // Load documents and document types on open
  useEffect(() => {
    if (!open) return;
    
    setLoading(true);
    
    // First, fetch all users to populate usersMap
    fetch('/api/users/reduced', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch users: ${r.status}`);
        return r.json();
      })
      .then((users: User[]) => {
        const newUsersMap: Record<number, string> = {};
        users.forEach((u: User) => {
          const name = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User ${u.user_id}`;
          newUsersMap[u.user_id] = name;
        });
        setUsersMap(newUsersMap);
        
        // Now fetch all documents
        return DocumentsApi.getAllDocuments().then(docs => ({ docs, usersMap: newUsersMap }));
      })
      .then(({ docs, usersMap: currentUsersMap }) => {
        const list = Array.isArray(docs) ? docs : [];
        setDocuments(list);
        setFilteredDocuments(list);
        
        // Fetch editors for each document
        const editorsPromises = list.map((doc: Document) =>
          DocumentsApi.getEditors(doc.document_id)
            .then((editors: any[]) => {
              const editorNames = editors.map((e: Editor) => 
                currentUsersMap[e.user_id] || `User ${e.user_id}`
              );
              return { docId: doc.document_id, editors: editorNames };
            })
            .catch(() => ({ docId: doc.document_id, editors: [] }))
        );
        
        Promise.all(editorsPromises).then(results => {
          const newEditorsMap: Record<number, string[]> = {};
          results.forEach(({ docId, editors }) => {
            newEditorsMap[docId] = editors;
          });
          setEditorsMap(newEditorsMap);
        });
      })
      .catch((err) => {
        push('Failed to load documents. Please try again.', 5, true);
        console.error('DocumentFinder error:', err);
        setDocuments([]);
        setFilteredDocuments([]);
      })
      .finally(() => setLoading(false));
    
    // Fetch document types
    fetch('/api/utility/document-types', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch document types: ${r.status}`);
        return r.json();
      })
      .then((types: DocumentType[]) => {
        const typesMap: Record<number, string> = {};
        types.forEach((t: DocumentType) => {
          typesMap[t.type_id] = t.type_name;
        });
        setDocumentTypes(typesMap);
      })
      .catch((err) => {
        push('Failed to load document types.', 3, true);
        console.error('DocumentFinder types error:', err);
      });
      
  }, [open, push]);

  // Filter documents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = documents.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.abstract.toLowerCase().includes(query) ||
      doc.document_id.toString().includes(query) ||
      doc.status.toLowerCase().includes(query)
    );
    setFilteredDocuments(filtered);
  }, [searchQuery, documents]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  const handleSelectDocument = (documentId: number) => {
    onSelect(documentId);
    onClose();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('hr-HR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return '—';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'var(--muted)';
      case 'submitted': return 'var(--warning)';
      case 'under_review': return 'var(--warning)';
      case 'graded': return 'var(--accent)';
      case 'finished': return 'var(--success)';
      default: return 'var(--text)';
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'var(--success)';
    if (grade >= 75) return 'var(--success)';
    if (grade >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const modal = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '95%',
          maxWidth: 1200,
          maxHeight: '90vh',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: 'var(--heading)', fontSize: '1.5rem' }}>
            Select Document
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '2rem',
              cursor: 'pointer',
              color: 'var(--text)',
              lineHeight: 1,
              padding: 0
            }}
          >
            ×
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Search documents by title, ID, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Documents grid */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
              {searchQuery ? 'No documents found matching your search.' : 'No documents available.'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.document_id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: 'var(--panel)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                  onClick={() => handleSelectDocument(doc.document_id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(var(--accent-rgb), 0.2)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Document ID & Type */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--muted)',
                      fontWeight: 600
                    }}>
                      ID: {doc.document_id}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 6,
                      background: 'var(--bg)',
                      color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}>
                      {documentTypes[doc.type_id] || `Type ${doc.type_id}`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.1rem', 
                    color: 'var(--heading)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {doc.title}
                  </h3>

                  {/* Abstract */}
                  <p style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: 'var(--muted)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {doc.abstract || 'No abstract available'}
                  </p>

                  {/* Status & Grade */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    alignItems: 'center',
                    marginTop: '0.5rem'
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: 6,
                      background: getStatusColor(doc.status),
                      color: 'white',
                      fontWeight: 600,
                      border: `1px solid ${getStatusColor(doc.status)}`
                    }}>
                      {doc.status.toUpperCase()}
                    </span>
                    {doc.grade !== null && doc.grade !== undefined && (
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.5rem',
                        borderRadius: 6,
                        background: getGradeColor(doc.grade),
                        color: 'white'
                      }}>
                        {doc.grade}
                      </span>
                    )}
                  </div>

                  {/* Created by */}
                  <div style={{ 
                    marginTop: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)'
                  }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--muted)', 
                      marginBottom: '0.25rem'
                    }}>
                      Created by: <strong style={{ color: 'var(--text)' }}>{usersMap[doc.created_by] || `User ${doc.created_by}`}</strong>
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--muted)'
                    }}>
                      {formatDate(doc.created_at)}
                    </div>
                  </div>

                  {/* Editors */}
                  {editorsMap[doc.document_id] && editorsMap[doc.document_id].length > 0 && (
                    <div style={{ 
                      marginTop: '0.5rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--muted)', 
                        marginBottom: '0.25rem',
                        fontWeight: 600
                      }}>
                        Editors ({editorsMap[doc.document_id].length}):
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: 'var(--text)',
                        lineHeight: 1.4
                      }}>
                        {showAllEditorsFor[doc.document_id] || editorsMap[doc.document_id].length <= 3
                          ? editorsMap[doc.document_id].join(', ')
                          : editorsMap[doc.document_id].slice(0, 3).join(', ') + '...'
                        }
                      </div>
                      {editorsMap[doc.document_id].length > 3 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAllEditorsFor(prev => ({
                              ...prev,
                              [doc.document_id]: !prev[doc.document_id]
                            }));
                          }}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.7rem',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {showAllEditorsFor[doc.document_id] ? 'SHOW LESS' : 'SHOW ALL'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default DocumentFinder;
