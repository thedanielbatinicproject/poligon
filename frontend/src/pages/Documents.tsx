import React, { useEffect, useState } from 'react';
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';
import DocumentsApi from '../lib/documentsApi';
import * as TasksApi from '../lib/tasksApi';
import ConfirmationBox from '../components/ConfirmationBox';
import YjsEditor from '../components/YjsEditor';
import { useSocket } from '../components/SocketProvider';

export default function Documents() {
  const sessionCtx = useSession();
  const user = sessionCtx.user;
  const session = sessionCtx.session;
  const loading = sessionCtx.loading;
  const notify = useNotifications();
  const { socket } = useSocket();

  // Document selection
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Editor state
  // Note: latexContent is now managed by Yjs editor, not React state
  const [isSaving, setIsSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Tasks sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [docTasks, setDocTasks] = useState<any[]>([]);

  // Files
  const [docFiles, setDocFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Modals
  const [abstractModalOpen, setAbstractModalOpen] = useState(false);
  const [abstractText, setAbstractText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<any>) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('Confirm action');
  const [confirmQuestion, setConfirmQuestion] = useState('Are you sure?');

  // Connected users (for real-time collaboration)
  const [connectedUsers, setConnectedUsers] = useState<number>(0);

  // User's role on selected document
  const [userRole, setUserRole] = useState<string>('viewer');

  // Load documents on mount
  useEffect(() => {
    if (loading || !user) return;
    
    const userId = user.user_id || user.id;
    if (!userId) return;
    
    DocumentsApi.getAllDocuments()
      .then((docs) => {
        const docsArray = Array.isArray(docs) ? docs : [];
        setDocuments(docsArray);
        
        if (session?.last_document_id) {
          const lastDoc = docsArray.find((d: any) => d.document_id === session.last_document_id);
          if (lastDoc) {
            setSelectedDocId(session.last_document_id);
          }
        }
      })
      .catch((err) => {
        notify.push('Failed to load documents', undefined, true);
      });
  }, [loading, user?.user_id, user?.id, session?.last_document_id]);

  // Load selected document details
  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      // Yjs editor will handle content loading
      setDocTasks([]);
      setDocFiles([]);
      return;
    }

    // Save to session
    fetch('/api/utility/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ last_document_id: selectedDocId })
    }).catch(() => {});

    // Load document
    const doc = documents.find(d => d.document_id === selectedDocId);
    if (doc) {
      setSelectedDoc(doc);
      setAbstractText(doc.abstract || '');
      
      // Yjs editor will load content automatically via WebSocket

      // Load editors to determine user role
      DocumentsApi.getEditors(selectedDocId)
        .then((editors: any[]) => {
          const userEditor = editors.find(e => e.user_id === user?.id);
          const role = userEditor?.role || 'viewer';
          setUserRole(role);
          
          // Check if read-only
          const isViewer = role === 'viewer';
          const isUnderReview = doc.status === 'under_review' && role !== 'mentor' && session?.role !== 'admin';
          setIsReadOnly(isViewer || isUnderReview);
        })
        .catch(() => setUserRole('viewer'));

      // Load tasks
      TasksApi.getTasksForDocument(selectedDocId)
        .then((tasks: any) => setDocTasks(Array.isArray(tasks) ? tasks : []))
        .catch(() => setDocTasks([]));

      // Load files
      fetch(`/api/files/document/${selectedDocId}`, { credentials: 'include' })
        .then(r => r.json())
        .then((files: any) => setDocFiles(Array.isArray(files) ? files : []))
        .catch(() => setDocFiles([]));
    }
  }, [selectedDocId, documents, user?.id]);

  // Handle document selection
  const handleDocumentSelect = (docId: number) => {
    setSelectedDocId(docId);
  };

  // Manual save/audit log (Yjs auto-syncs content to backend)
  const handleSave = async () => {
    if (!selectedDocId || isReadOnly) return;
    
    setIsSaving(true);
    try {
      notify.push('Changes are automatically saved via Yjs sync', 2);
      
      // Create audit log for manual save action
      await fetch('/api/utility/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action_type: 'edit',
          entity_type: 'document',
          entity_id: selectedDocId
        })
      }).catch(() => {});
    } catch (err: any) {
      notify.push(err?.message || 'Failed to log action', undefined, true);
    } finally {
      setIsSaving(false);
    }
  };

  // Save abstract
  const handleSaveAbstract = async () => {
    if (!selectedDocId) return;
    
    try {
      await DocumentsApi.updateDocument(selectedDocId, { abstract: abstractText });
      notify.push('Abstract saved', 2);
      setAbstractModalOpen(false);
      
      // Update local state
      if (selectedDoc) {
        setSelectedDoc({ ...selectedDoc, abstract: abstractText });
      }
    } catch (err: any) {
      notify.push(err?.message || 'Failed to save abstract', undefined, true);
    }
  };

  // Submit for review
  const handleSubmitForReview = async () => {
    if (!selectedDocId) return;
    
    try {
      await fetch(`/api/documents/${selectedDocId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'under_review' })
      });
      
      notify.push('Document submitted for review', 3);
      setConfirmOpen(false);
      
      // Reload document
      const docs = await DocumentsApi.getAllDocuments();
      setDocuments(Array.isArray(docs) ? docs : []);
      const updatedDoc = docs.find((d: any) => d.document_id === selectedDocId);
      if (updatedDoc) {
        setSelectedDoc(updatedDoc);
        setIsReadOnly(true);
      }
    } catch (err: any) {
      notify.push(err?.message || 'Failed to submit document', undefined, true);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDocId || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_id', String(selectedDocId));
    
    setUploading(true);
    try {
      // Determine upload endpoint based on file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg'];
      const isImage = imageExtensions.includes(fileExtension || '');
      
      const endpoint = isImage ? '/api/files/upload/image' : '/api/files/upload/document';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      notify.push('File uploaded successfully', 2);
      
      // Reload files
      const filesResponse = await fetch(`/api/files/document/${selectedDocId}`, { credentials: 'include' });
      const files = await filesResponse.json();
      setDocFiles(Array.isArray(files) ? files : []);
      
      // Create audit log
      await fetch('/api/utility/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action_type: 'upload',
          entity_type: 'file',
          entity_id: selectedDocId
        })
      }).catch(() => {});
    } catch (err: any) {
      notify.push(err?.message || 'Failed to upload file', undefined, true);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Handle file delete
  const handleFileDelete = async (fileId: number, uploadedBy: number) => {
    if (!selectedDocId) return;
    
    // Check if user can delete (uploader, mentor, or admin)
    const canDelete = uploadedBy === user?.id || userRole === 'mentor' || session?.role === 'admin';
    if (!canDelete) {
      notify.push('You do not have permission to delete this file', undefined, true);
      return;
    }
    
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      notify.push('File deleted', 2);
      
      // Reload files
      const filesResponse = await fetch(`/api/files/document/${selectedDocId}`, { credentials: 'include' });
      const files = await filesResponse.json();
      setDocFiles(Array.isArray(files) ? files : []);
      
      // Create audit log
      await fetch('/api/utility/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action_type: 'delete',
          entity_type: 'file',
          entity_id: selectedDocId
        })
      }).catch(() => {});
    } catch (err: any) {
      notify.push(err?.message || 'Failed to delete file', undefined, true);
    }
  };

  // Show LaTeX packages info
  const showPackagesInfo = () => {
    const message = `
✅ SUPPORTED PACKAGES:
inputenc, fontenc, lmodern, babel, geometry, microtype, xcolor, hyperref, amsmath, amssymb, amsfonts, mathtools, physics, siunitx, mhchem, cancel, ulem, graphicx, tikz, pgfplots, subcaption, caption, booktabs, array, multicol, enumitem, fancyhdr, titlesec, url, setspace, parskip, ragged2e

❌ NOT SUPPORTED:
fontawesome5, skak, qtree, dingbat, chemfig, pstricks, fontspec, glossaries, glossaries-extra, biblatex, biber, natbib, minted, tcolorbox, forest, tikz-qtree, tikz-cd
    `.trim();
    
    notify.push(message, 30); // 30 seconds duration
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text)', textAlign: 'center' }}>
      Loading session...
    </div>;
  }

  if (!user) {
    return <div style={{ padding: '2rem', color: 'var(--text)' }}>
      Please log in to access documents.
    </div>;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 60px)',
      background: 'var(--bg)',
      color: 'var(--text)'
    }}>
      {/* Compact top bar - Document selector */}
      <div className="glass-panel" style={{ 
        padding: '0.75rem 1rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <label style={{ fontWeight: 600, color: 'var(--heading)', fontSize: '0.9rem' }}>DOCUMENT:</label>
        <select
          value={selectedDocId || ''}
          onChange={(e) => handleDocumentSelect(Number(e.target.value))}
          style={{
            flex: '1 1 auto',
            minWidth: 250,
            maxWidth: 450,
            padding: '0.4rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text)',
            fontSize: '0.9rem'
          }}
        >
          <option value="">-- Select a document --</option>
          {documents.map(doc => (
            <option key={doc.document_id} value={doc.document_id}>
              {doc.title} ({doc.status})
            </option>
          ))}
        </select>
        
        {selectedDoc && (
          <>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem', marginLeft: 'auto' }}>
              👥 <strong style={{ color: 'var(--accent)' }}>{connectedUsers}</strong> online
            </span>
            <button className="btn btn-ghost" onClick={showPackagesInfo} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
              ℹ️ Packages
            </button>
          </>
        )}
      </div>

      {/* Main content area */}
      {selectedDocId ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>
          {/* Collapsible Left sidebar - Tasks */}
          <div style={{
            width: sidebarCollapsed ? 48 : 280,
            minWidth: sidebarCollapsed ? 48 : 280,
            transition: 'all 0.3s ease',
            borderRight: '1px solid var(--border)',
            background: 'var(--panel)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.6rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg)'
            }}>
              {!sidebarCollapsed && <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Tasks</h3>}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="btn btn-ghost"
                style={{ padding: '0.3rem 0.5rem', fontSize: '1.1rem' }}
                title={sidebarCollapsed ? 'Expand tasks' : 'Collapse tasks'}
              >
                {sidebarCollapsed ? '▶' : '◀'}
              </button>
            </div>
            
            {!sidebarCollapsed && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {docTasks.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                    No tasks assigned
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {docTasks.map(task => {
                      const dueDate = task.due ? new Date(task.due) : null;
                      const isOverdue = dueDate && dueDate < new Date() && task.task_status !== 'closed';
                      const dueDateStr = dueDate ? dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null;
                      
                      return (
                        <div key={task.task_id} style={{
                          padding: '0.75rem',
                          background: 'var(--bg)',
                          border: `1px solid ${isOverdue ? 'var(--error)' : 'var(--border)'}`,
                          borderRadius: 8,
                          boxShadow: isOverdue ? '0 0 0 1px rgba(239, 68, 68, 0.2)' : 'none'
                        }}>
                          <div style={{ 
                            fontWeight: 600, 
                            fontSize: '0.9rem', 
                            marginBottom: '0.4rem',
                            color: task.task_status === 'closed' ? 'var(--success)' : 'var(--text)'
                          }}>
                            {task.task_title}
                          </div>
                          
                          {task.task_description && (
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: 'var(--muted)', 
                              marginBottom: '0.5rem',
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {task.task_description.length > 80 
                                ? `${task.task_description.substring(0, 80)}...` 
                                : task.task_description}
                            </div>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            color: 'var(--muted)'
                          }}>
                            {task.assigned_to_name && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>👤</span>
                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{task.assigned_to_name}</span>
                              </div>
                            )}
                            
                            {dueDateStr && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>{isOverdue ? '⚠️' : '📅'}</span>
                                <span style={{ 
                                  fontWeight: 500,
                                  color: isOverdue ? 'var(--error)' : 'var(--text)'
                                }}>
                                  Due: {dueDateStr}
                                </span>
                              </div>
                            )}
                            
                            <div style={{ 
                              display: 'inline-block',
                              marginTop: '0.3rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 4,
                              background: task.task_status === 'closed' ? 'var(--success)' : 'var(--warning)',
                              color: '#fff',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              alignSelf: 'flex-start'
                            }}>
                              {task.task_status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CENTER - EDITOR AREA (MAIN FOCUS) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* Minimal toolbar */}
            <div className="glass-panel" style={{
              padding: '0.5rem 1rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={isReadOnly || isSaving}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
              >
                {isSaving ? '💾 Saving...' : '💾 Save'}
              </button>
              {isReadOnly && (
                <span style={{ marginLeft: 'auto', color: 'var(--warning)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  🔒 <span>Read-only</span>
                </span>
              )}
            </div>

            {/* Split view editor - 60/40 split favoring preview */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left: LaTeX Editor (40%) */}
              <div style={{ 
                flex: '0 0 42%',
                minWidth: 400,
                display: 'flex', 
                flexDirection: 'column', 
                borderRight: '1px solid var(--border)',
                background: 'var(--panel)'
              }}>
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  background: 'var(--bg)', 
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--heading)'
                }}>
                  LaTeX Editor
                </div>
                {selectedDocId ? (
                  <YjsEditor 
                    documentId={selectedDocId} 
                    readOnly={isReadOnly}
                    onUserCountChange={setConnectedUsers}
                  />
                ) : (
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--muted)',
                    fontSize: '0.9rem'
                  }}>
                    Select a document to start editing
                  </div>
                )}
              </div>

              {/* Right: Preview (58%) */}
              <div style={{ 
                flex: 1,
                minWidth: 450,
                display: 'flex', 
                flexDirection: 'column',
                background: 'var(--bg)'
              }}>
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  background: 'var(--panel)', 
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--heading)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>Preview</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>
                    (Compile to view)
                  </span>
                </div>
                <div style={{ 
                  flex: 1, 
                  padding: '2rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--muted)',
                  fontSize: '0.95rem'
                }}>
                  📄 Preview will be available after compilation
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar - Compact info cards */}
          <div style={{
            width: 260,
            minWidth: 260,
            borderLeft: '1px solid var(--border)',
            background: 'var(--panel)',
            overflowY: 'auto',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {/* Abstract card */}
            <div className="glass-panel" style={{ padding: '0.75rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Abstract</h3>
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--muted)', 
                marginBottom: '0.6rem', 
                lineHeight: 1.5,
                maxHeight: 80,
                overflow: 'auto'
              }}>
                {selectedDoc?.abstract || 'No abstract provided'}
              </p>
              <button className="btn btn-action" onClick={() => setAbstractModalOpen(true)} style={{ 
                padding: '0.4rem 0.7rem', 
                fontSize: '0.8rem',
                width: '100%'
              }}>
                Edit Abstract
              </button>
            </div>

            {/* Submit for review card */}
            <div className="glass-panel" style={{ padding: '0.75rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Status</h3>
              <div style={{ 
                fontSize: '0.8rem', 
                marginBottom: '0.6rem',
                padding: '0.4rem 0.6rem',
                background: 'var(--bg)',
                borderRadius: 6,
                border: '1px solid var(--border)'
              }}>
                <span style={{ color: 'var(--muted)' }}>Current: </span>
                <strong style={{ color: 'var(--accent)' }}>{selectedDoc?.status}</strong>
              </div>

              {/* If draft status, show submit for review button with confirmation */}
              {selectedDoc?.status === 'draft' && (
                <button 
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', width: '100%' }}
                  onClick={() => {
                    setConfirmTitle('Submit for Review');
                    setConfirmQuestion('Once submitted, the document cannot be edited until a mentor reviews and returns it or grades it. Continue?');
                    setConfirmAction(() => handleSubmitForReview);
                    setConfirmOpen(true);
                  }}
                >
                  Submit for Review
                </button>
              )}

              {/* If finished, submitted, or graded status, show grade */}
              {(selectedDoc?.status === 'finished' || selectedDoc?.status === 'submitted' || selectedDoc?.status === 'graded') && (
                <div style={{ marginTop: '0.6rem' }}>
                  {selectedDoc.grade !== null && selectedDoc.grade !== undefined ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: 8,
                      background: 'var(--bg)',
                      border: '2px solid var(--border)'
                    }}>
                      <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>GRADE:</span>
                      <span style={{
                        fontWeight: 'bold',
                        fontSize: selectedDoc.grade >= 90 ? '2rem' : selectedDoc.grade >= 75 ? '1.5rem' : selectedDoc.grade >= 50 ? '1.2rem' : '1.4rem',
                        color: selectedDoc.grade >= 90 ? '#00ff00' : selectedDoc.grade >= 75 ? '#28a745' : selectedDoc.grade >= 50 ? '#ff8c00' : '#dc3545'
                      }}>
                        {selectedDoc.grade}
                        {selectedDoc.grade >= 90 && ' 😎'}
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: 8,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--muted)',
                      fontSize: '0.85rem',
                      textAlign: 'center'
                    }}>
                      Grade not found!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload files card */}
            <div className="glass-panel" style={{ padding: '0.75rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Files</h3>
              {docFiles.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.6rem', textAlign: 'center', padding: '0.5rem' }}>
                  No files uploaded
                </div>
              ) : (
                <div style={{ marginBottom: '0.6rem', maxHeight: 200, overflowY: 'auto' }}>
                  {docFiles.map((file: any) => {
                    const canDelete = file.uploaded_by === user?.id || userRole === 'mentor' || session?.role === 'admin';
                    return (
                      <div key={file.file_id} style={{ 
                        marginBottom: '0.4rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.4rem 0.5rem',
                        background: 'var(--bg)',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        fontSize: '0.75rem'
                      }}>
                        <span style={{ 
                          flex: 1, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          marginRight: '0.5rem'
                        }}>
                          📎 {file.file_name}
                        </span>
                        {canDelete && (
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                            onClick={() => {
                              setConfirmTitle('Delete File');
                              setConfirmQuestion(`Are you sure you want to delete "${file.file_name}"?`);
                              setConfirmAction(() => async () => await handleFileDelete(file.file_id, file.uploaded_by));
                              setConfirmOpen(true);
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <label 
                className="btn btn-action" 
                style={{ 
                  display: 'block', 
                  textAlign: 'center',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  padding: '0.4rem 0.7rem',
                  fontSize: '0.8rem'
                }}
              >
                {uploading ? 'Uploading...' : '📤 Upload File'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                  accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.svg,.pdf,.bib,.tex"
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--heading)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>No document selected</h2>
            <p style={{ fontSize: '0.95rem' }}>Please select a document from the dropdown above</p>
          </div>
        </div>
      )}

      {/* Abstract modal */}
      {abstractModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setAbstractModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '90%',
              maxWidth: 600,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '1.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--heading)' }}>Edit Abstract</h3>
            <textarea
              value={abstractText}
              onChange={(e) => setAbstractText(e.target.value)}
              style={{
                width: '100%',
                minHeight: 200,
                padding: '0.75rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.95rem',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              placeholder="Enter document abstract..."
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setAbstractModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveAbstract}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <ConfirmationBox
        isOpen={confirmOpen}
        title={confirmTitle}
        question={confirmQuestion}
        onConfirm={async () => {
          if (confirmAction) {
            await confirmAction();
          }
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}