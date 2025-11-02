import React, { useEffect, useState } from 'react';
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';
import DocumentsApi from '../lib/documentsApi';
import * as TasksApi from '../lib/tasksApi';
import ConfirmationBox from '../components/ConfirmationBox';
import { useSocket } from '../components/SocketProvider';

export default function Documents() {
  const sessionCtx = useSession();
  const user = sessionCtx.user;
  const session = sessionCtx.session;
  const notify = useNotifications();
  const { socket } = useSocket();

  // Document selection
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Editor state
  const [latexContent, setLatexContent] = useState('');
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
    if (!user?.id) return;
    
    // Load all documents where user is editor/owner/mentor/viewer or creator
    DocumentsApi.getAllDocuments()
      .then((docs) => {
        setDocuments(Array.isArray(docs) ? docs : []);
        
        // Try to restore last selected document from session
        if (session?.last_document_id) {
          const lastDoc = docs.find((d: any) => d.document_id === session.last_document_id);
          if (lastDoc) {
            setSelectedDocId(session.last_document_id);
          }
        }
      })
      .catch((err) => notify.push('Failed to load documents', undefined, true));
  }, [user?.id]);

  // Load selected document details
  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      setLatexContent('');
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
      
      // Load LaTeX content
      DocumentsApi.getDocumentContent(selectedDocId)
        .then(content => setLatexContent(content || ''))
        .catch(() => setLatexContent(''));

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

  // Save LaTeX content
  const handleSave = async () => {
    if (!selectedDocId || isReadOnly) return;
    
    setIsSaving(true);
    try {
      await DocumentsApi.updateDocumentContent(selectedDocId, { latex_content: latexContent });
      notify.push('Document saved', 2);
      
      // Create audit log
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
      notify.push(err?.message || 'Failed to save document', undefined, true);
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

  if (!user) {
    return <div style={{ padding: '2rem', color: 'var(--text)' }}>Please log in to access documents.</div>;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 60px)',
      background: 'var(--bg)',
      color: 'var(--text)'
    }}>
      {/* Top bar - Document selector */}
      <div className="glass-panel" style={{ 
        padding: '1rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <label style={{ fontWeight: 600, color: 'var(--heading)' }}>SELECT DOCUMENT:</label>
        <select
          value={selectedDocId || ''}
          onChange={(e) => handleDocumentSelect(Number(e.target.value))}
          style={{
            flex: 1,
            maxWidth: 500,
            padding: '0.5rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text)',
            fontSize: '1rem'
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Connected users: <strong style={{ color: 'var(--accent)' }}>{connectedUsers}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main content area */}
      {selectedDocId ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Tasks sidebar */}
          <div style={{
            width: sidebarCollapsed ? 40 : 300,
            transition: 'width 0.3s ease',
            borderRight: '1px solid var(--border)',
            background: 'var(--panel)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.75rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {!sidebarCollapsed && <h3 style={{ margin: 0, fontSize: '1rem' }}>Tasks</h3>}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="btn btn-ghost"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                {sidebarCollapsed ? '→' : '←'}
              </button>
            </div>
            
            {!sidebarCollapsed && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                {docTasks.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '1rem' }}>No tasks</div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {docTasks.map(task => (
                      <li key={task.task_id} style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 6
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{task.task_title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{task.task_description}</div>
                        <div style={{ fontSize: '0.75rem', color: task.task_status === 'closed' ? 'var(--success)' : 'var(--warning)', marginTop: '0.5rem' }}>
                          {task.task_status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Center - Editor area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Editor toolbar */}
            <div className="glass-panel" style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={isReadOnly || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-ghost" onClick={showPackagesInfo}>
                ℹ️ Packages Info
              </button>
              {isReadOnly && (
                <span style={{ marginLeft: 'auto', color: 'var(--warning)', fontSize: '0.9rem' }}>
                  🔒 Read-only mode
                </span>
              )}
            </div>

            {/* Split view editor */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left: LaTeX code */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
                <div style={{ padding: '0.5rem 1rem', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                  <strong>LaTeX Editor</strong>
                </div>
                <textarea
                  value={latexContent}
                  onChange={(e) => setLatexContent(e.target.value)}
                  readOnly={isReadOnly}
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: '1rem',
                    border: 'none',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    resize: 'none',
                    outline: 'none'
                  }}
                  placeholder="Enter LaTeX code here..."
                />
              </div>

              {/* Right: Preview placeholder */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0.5rem 1rem', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                  <strong>Preview (Compile to view)</strong>
                </div>
                <div style={{ flex: 1, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                  Preview will be available after compilation
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar - Cards */}
          <div style={{
            width: 320,
            borderLeft: '1px solid var(--border)',
            background: 'var(--panel)',
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Abstract card */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Abstract</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {selectedDoc?.abstract || 'No abstract provided'}
              </p>
              <button className="btn btn-action" onClick={() => setAbstractModalOpen(true)}>
                Edit Abstract
              </button>
            </div>

            {/* Submit for review card */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Submit for Review</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Current status: <strong style={{ color: 'var(--accent)' }}>{selectedDoc?.status}</strong>
              </p>
              {selectedDoc?.status !== 'under_review' && selectedDoc?.status !== 'graded' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setConfirmTitle('Submit for Review');
                    setConfirmQuestion('Once submitted, the document cannot be edited until reviewed by a mentor or admin. Continue?');
                    setConfirmAction(() => handleSubmitForReview);
                    setConfirmOpen(true);
                  }}
                >
                  Submit for Review
                </button>
              )}
            </div>

            {/* Upload files card */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Uploaded Files</h3>
              {docFiles.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>No files uploaded</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem 0', fontSize: '0.85rem' }}>
                  {docFiles.map((file: any) => (
                    <li key={file.file_id} style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{file.file_name}</span>
                      <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button className="btn btn-action" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--heading)' }}>No document selected</h2>
            <p>Please select a document from the dropdown above</p>
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