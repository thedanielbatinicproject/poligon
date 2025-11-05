import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';
import DocumentsApi from '../lib/documentsApi';
import * as TasksApi from '../lib/tasksApi';
import UserFinder from '../components/UserFinder';
import DocumentFinder from '../components/DocumentFinder';
import ConfirmationBox from '../components/ConfirmationBox';
import { useSocket } from '../components/SocketProvider';
import WorkflowHistoryModal from '../components/WorkflowHistoryModal';
import AuditLogModal from '../components/AuditLogModal';
import DocumentGrader from '../components/DocumentGrader';

export default function Mentor() {
  const sessionCtx = useSession();
  const user = sessionCtx.user;
  const session = sessionCtx.session;
  const notify = useNotifications();
  const { socket } = useSocket();

  const [documents, setDocuments] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<Array<any>>([]);

  // editors
  const [editors, setEditors] = useState<any[]>([]);
  // users map for labels (id -> "First Last")
  const [usersMap, setUsersMap] = useState<Record<number,string>>({});
  const [userFinderOpen, setUserFinderOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<any>) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string>('Confirm action');
  const [confirmQuestion, setConfirmQuestion] = useState<string>('Are you sure?');

  // tasks for document
  const [docTasks, setDocTasks] = useState<any[]>([]);
  const [docVersions, setDocVersions] = useState<any[]>([]);
  const [docFiles, setDocFiles] = useState<any[]>([]);
  const [savingType, setSavingType] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [rendersToShow, setRendersToShow] = useState(3);
  const [workflowHistoryOpen, setWorkflowHistoryOpen] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState<any[]>([]);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [documentGraderOpen, setDocumentGraderOpen] = useState(false);
  const [preGradeConfirmOpen, setPreGradeConfirmOpen] = useState(false);
  const [preGradeConfirmMessage, setPreGradeConfirmMessage] = useState('');
  const [documentFinderOpen, setDocumentFinderOpen] = useState(false);

  // helper: format timestamp to DD.MM.YYYY.@HH:MM(:SS)
  // includeSeconds: when false, omit the trailing :SS
  const formatDate = (ts: any, includeSeconds: boolean = true) => {
    if (!ts) return '—';
    try {
      // normalize common SQL zero-timestamp and empty variants
      const s = String(ts).trim();
      if (!s || s.startsWith('0000-00-00')) return '—';

      // Try direct parse first
      let d = new Date(s);
      if (isNaN(d.getTime())) {
        // try to normalize 'YYYY-MM-DD HH:MM:SS' -> 'YYYY-MM-DDTHH:MM:SS' (ISO-ish)
        const iso = s.replace(' ', 'T');
        d = new Date(iso);
      }
      if (isNaN(d.getTime())) return '—';
      const pad = (n: number) => (n < 10 ? '0' + n : String(n));
      const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return includeSeconds ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} @ ${hhmm}:${pad(d.getSeconds())}` : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} @ ${hhmm}`;
    } catch (e) { return '—'; }
  };

  // Handle Grade Document button click with confirmation for non-under_review statuses
  const handleGradeDocumentClick = () => {
    if (!selectedDoc) return;
    
    const status = selectedDoc.status;
    
    // If under_review, open directly with pulsing effect
    if (status === 'under_review') {
      setDocumentGraderOpen(true);
      return;
    }
    
    // For other statuses, show confirmation first
    let confirmMessage = '';
    
    switch (status) {
      case 'graded':
        confirmMessage = 'This document is already graded. Proceeding will result in an irreversible grade overwrite!';
        break;
      case 'submitted':
        confirmMessage = 'This document has been submitted to faculty. Are you sure you want to grade it now?';
        break;
      case 'finished':
        confirmMessage = 'This document has been marked as finished by the faculty. Are you sure you want to change the grade?';
        break;
      case 'draft':
        confirmMessage = 'This document is still in draft status. Are you sure you want to grade it?';
        break;
      default:
        confirmMessage = 'Are you sure you want to grade this document?';
    }
    
    setPreGradeConfirmMessage(confirmMessage);
    setPreGradeConfirmOpen(true);
  };

  // Reload workflow history for selected document
  const reloadWorkflowHistory = async () => {
    if (!selectedDocId) return;
    try {
      const wf = await fetch(`/api/documents/${selectedDocId}/workflow`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : []);
      setWorkflowHistory(Array.isArray(wf) ? wf : []);
    } catch (err) {
      setWorkflowHistory([]);
    }
  };

  // Get the user who sent document to review from workflow history
  const getUnderReviewUser = () => {
    if (!workflowHistory || workflowHistory.length === 0) return null;
    
    // Find the most recent 'under_review' status change
    const underReviewEvent = workflowHistory
      .slice()
      .reverse()
      .find((event: any) => event.status === 'under_review' || event.new_status === 'under_review');
    
    if (!underReviewEvent) return null;
    
    const userId = underReviewEvent.changed_by;
    const userName = usersMap[userId] || `User ${userId}`;
    
    return { userId, userName };
  };

  useEffect(() => {
    // load documents accessible to this user
    DocumentsApi.getAllDocuments()
      .then((list: any[]) => setDocuments(Array.isArray(list) ? list : []))
      .catch((err) => notify.push(String(err), undefined, true));
    // fetch document types for create form
    DocumentsApi.getDocumentTypes().then((t: any[]) => setDocumentTypes(Array.isArray(t) ? t : [])).catch(() => {});
    // load reduced user list for labels (prefer display_name)
    TasksApi.getReducedUsers()
      .then((list: any[]) => {
        if (!Array.isArray(list)) return;
        const map: Record<number,string> = {};
        for (const u of list) {
          const id = Number(u.user_id ?? u.id ?? u.userId ?? 0);
          if (!id) continue;
          const name = (u.display_name && String(u.display_name).trim()) || `${(u.first_name ?? u.firstName ?? '').trim()} ${(u.last_name ?? u.lastName ?? '').trim()}`.trim() || (u.email ?? '') || String(id);
          map[id] = name;
        }
        setUsersMap(map);
      })
      .catch(() => {});
  }, []);

  // restore last selected document from session when documents or session load
  useEffect(() => {
    try {
  if (!session || !documents) return;
  const hasKey = Object.prototype.hasOwnProperty.call(session || {}, 'last_document_id') || Object.prototype.hasOwnProperty.call(session || {}, 'last_document');
  if (!hasKey) return;
  const raw = ('last_document_id' in (session || {})) ? session.last_document_id : session.last_document;
      if (raw === null || typeof raw === 'undefined') return;
      const id = Number(raw);
      if (!isNaN(id)) setSelectedDocId(id);
    } catch (e) {
      notify.push('Failed to restore last selected document from session, full log: ' + String(e), undefined, true);
    }
  }, [session, documents]);

  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      setEditors([]);
      setDocTasks([]);
      setRendersToShow(3);
      return;
    }
    // Only run this effect when the selectedDocId changes. Previously this
    // depended on `documents` as well which caused it to re-run whenever we
    // replaced the documents array (for example after a successful save),
    // producing multiple GET requests (editors, tasks) after a single PUT.
    // We intentionally do not include `documents` in deps here because we
    // update `selectedDoc` explicitly elsewhere when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocId]);

  // Keep a separate effect to synchronize `selectedDoc` when documents change
  // only if the selected document is missing (e.g., fresh load). This avoids
  // triggering editors/tasks reload after local saves that replaced documents.
  useEffect(() => {
    if (!selectedDocId) return;
    const existing = documents.find((x) => Number(x.document_id) === Number(selectedDocId)) || null;
    if (existing) {
      // Always update to get fresh status/grade changes
      setSelectedDoc(existing);
    }
  }, [documents, selectedDocId]);

  // Effect to load editors and tasks when selectedDoc changes
  useEffect(() => {
    if (!selectedDocId) return;
    DocumentsApi.getEditors(Number(selectedDocId)).then((res) => {
      const arr = Array.isArray(res) ? res : [];
      setEditors(arr);
      const missing: number[] = [];
      for (const ed of arr) {
        const id = Number(ed.user_id ?? ed.id ?? 0);
        if (id && !usersMap[id]) missing.push(id);
      }
      if (missing.length > 0) {
        TasksApi.getReducedUsers().then((list: any[]) => {
          if (!Array.isArray(list)) return;
          const map: Record<number,string> = {};
          for (const u of list) {
            const id = Number(u.user_id ?? u.id ?? u.userId ?? 0);
            if (!id) continue;
            const name = (u.display_name && String(u.display_name).trim()) || `${(u.first_name ?? u.firstName ?? '').trim()} ${(u.last_name ?? u.lastName ?? '').trim()}`.trim() || (u.email ?? '') || String(id);
            map[id] = name;
          }
          setUsersMap(prev => ({ ...prev, ...map }));
        }).catch(() => {});
      }
    }).catch(() => {});
    // load tasks for doc (small list)
    TasksApi.getTasksForDocument(Number(selectedDocId)).then((r) => setDocTasks(Array.isArray(r) ? r : (r.tasks || []))).catch(() => {});
    // load document versions
    DocumentsApi.getVersions(Number(selectedDocId)).then((r) => setDocVersions(Array.isArray(r) ? r : [])).catch(() => {});
    // load files for document
    DocumentsApi.getFiles(Number(selectedDocId)).then((r) => setDocFiles(Array.isArray(r) ? r : [])).catch(() => {});
    // load workflow history
    fetch(`/api/documents/${selectedDocId}/workflow`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((wf: any[]) => {
        setWorkflowHistory(Array.isArray(wf) ? wf : []);
        // Ensure we have user names for changed_by IDs
        const missing: number[] = [];
        for (const event of (Array.isArray(wf) ? wf : [])) {
          const id = Number(event.changed_by || 0);
          if (id && !usersMap[id]) missing.push(id);
        }
        if (missing.length > 0) {
          TasksApi.getReducedUsers().then((list: any[]) => {
            if (!Array.isArray(list)) return;
            const map: Record<number,string> = {};
            for (const u of list) {
              const id = Number(u.user_id ?? u.id ?? u.userId ?? 0);
              if (!id) continue;
              const name = (u.display_name && String(u.display_name).trim()) || `${(u.first_name ?? u.firstName ?? '').trim()} ${(u.last_name ?? u.lastName ?? '').trim()}`.trim() || (u.email ?? '') || String(id);
              map[id] = name;
            }
            setUsersMap(prev => ({ ...prev, ...map }));
          }).catch(() => {});
        }
      })
      .catch(() => setWorkflowHistory([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocId]);

  // Ensure we have uploader display names for files
  useEffect(() => {
    const missing: number[] = [];
    for (const f of docFiles) {
      const id = Number(f.uploaded_by || 0);
      if (id && !usersMap[id]) missing.push(id);
    }
    if (missing.length === 0) return;
    // fetch reduced users (this returns all reduced users and merges into usersMap)
    TasksApi.getReducedUsers().then((list: any[]) => {
      if (!Array.isArray(list)) return;
      const map: Record<number,string> = {};
      for (const u of list) {
        const id = Number(u.user_id ?? u.id ?? u.userId ?? 0);
        if (!id) continue;
        const name = (u.display_name && String(u.display_name).trim()) || `${(u.first_name ?? u.firstName ?? '').trim()} ${(u.last_name ?? u.lastName ?? '').trim()}`.trim() || (u.email ?? '') || String(id);
        map[id] = name;
      }
      setUsersMap(prev => ({ ...prev, ...map }));
    }).catch(() => {});
  }, [docFiles]);

  // Ensure we have labels for any assigned_to or created_by referenced in tasks
  useEffect(() => {
    const needed: number[] = [];
    for (const t of docTasks) {
      if (t.assigned_to && !usersMap[Number(t.assigned_to)]) needed.push(Number(t.assigned_to));
      if (t.created_by && !usersMap[Number(t.created_by)]) needed.push(Number(t.created_by));
    }
    if (needed.length === 0) return;
    TasksApi.getReducedUsers().then((list: any[]) => {
      if (!Array.isArray(list)) return;
      const map: Record<number,string> = {};
      for (const u of list) {
        const id = Number(u.user_id ?? u.id ?? u.userId ?? 0);
        if (!id) continue;
        const name = (u.display_name && String(u.display_name).trim()) || `${(u.first_name ?? u.firstName ?? '').trim()} ${(u.last_name ?? u.lastName ?? '').trim()}`.trim() || (u.email ?? '') || String(id);
        map[id] = name;
      }
      setUsersMap(prev => ({ ...prev, ...map }));
    }).catch(() => {});
  }, [docTasks]);

  // Ensure we have display names for version editors
  useEffect(() => {
    const missing: number[] = [];
    for (const v of docVersions) {
      const id = Number(v.edited_by || v.edited_by_id || v.edited_by_user_id || 0);
      if (id && !usersMap[id]) missing.push(id);
    }
    if (missing.length === 0) return;
    TasksApi.getReducedUsers().then((list: any[]) => {
      if (!Array.isArray(list)) return;
      const map: Record<number,string> = {};
      for (const u of list) {
        const id = Number(u.user_id ?? u.id ?? u.userId ?? 0);
        if (!id) continue;
        const name = (u.display_name && String(u.display_name).trim()) || `${(u.first_name ?? u.firstName ?? '').trim()} ${(u.last_name ?? u.lastName ?? '').trim()}`.trim() || (u.email ?? '') || String(id);
        map[id] = name;
      }
      setUsersMap(prev => ({ ...prev, ...map }));
    }).catch(() => {});
  }, [docVersions]);

  // Socket listener for render completion
  useEffect(() => {
    if (!socket || !user) return;

    const handleRenderFinished = (payload: any) => {
      // Only show notification if this user triggered the render
      const startedBy = Number(payload.started_by || 0);
      if (startedBy !== user.user_id && startedBy !== user.id) return;

      const TOTAL = 8;
      let remaining = TOTAL;

      if (payload.success) {
        const makeMsg = (s: number) => `Render finished successfully. Refreshing page to list new render in ${s} second${s === 1 ? '' : 's'}.`;
        let notifId = notify.push(makeMsg(remaining), TOTAL);

        const iv = window.setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            window.clearInterval(iv);
            return;
          }
          try { notify.update(notifId, makeMsg(remaining), remaining); } catch (e) {}
        }, 1000);

        setTimeout(() => {
          window.clearInterval(iv);
          window.location.reload();
        }, TOTAL * 1000);
      } else {
        // Error notification
        const errorMsg = payload.error || 'Render failed with unknown error';
        notify.push(`Render failed: ${errorMsg}`, 40, true);
      }
    };

    socket.on('document:render:finished', handleRenderFinished);

    return () => {
      socket.off('document:render:finished', handleRenderFinished);
    };
  }, [socket, user, notify]);

  // helper to download a file via fetch so we can intercept JSON errors and show notifications
  const fetchAndDownload = async (url: string, suggestedName?: string) => {
    try {
      const res = await fetch(url, { method: 'GET', credentials: 'include' });
      if (!res.ok) {
        // try parse json error
        let json: any = {};
        try { json = await res.json().catch(() => ({})); } catch (e) { json = {}; }
        const msg = (json && (json.error || json.message)) || `Download failed (status ${res.status})`;
        notify.push(String(msg), undefined, true);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      let filename = suggestedName || '';
      // Try extract filename from content-disposition header
      const m = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition) || /filename="?([^";\n]+)"?/i.exec(disposition);
      if (m && m[1]) filename = decodeURIComponent(m[1]);
      if (!filename) filename = suggestedName || 'download';
      const urlObject = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObject;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlObject);
    } catch (err: any) {
      console.error('[Mentor] download error', err);
      notify.push(String(err?.message || err), undefined, true);
    }
  }


  // filtered list for selector
  const filtered = useMemo(() => {
    const q = String(filter || '').toLowerCase();
    if (!q) return documents;
    return documents.filter(d => (String(d.title || '') + ' ' + String(d.document_id || '')).toLowerCase().includes(q));
  }, [documents, filter]);

  // create document form state (simple modal)
  const [newTitle, setNewTitle] = useState('');
  const [newTypeId, setNewTypeId] = useState<number | null>(null);
  const [newLang, setNewLang] = useState<'hr'|'en'>('hr');
  const [newAbstract, setNewAbstract] = useState('');

  const openCreate = () => { setCreating(true); };
  const closeCreate = () => { setCreating(false); setNewTitle(''); setNewAbstract(''); setNewTypeId(null); setNewLang('hr'); }

  // lock body scroll when create modal is open
  useEffect(() => {
    if (creating) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return;
  }, [creating]);

  const doCreate = async () => {
    if (!newTitle) return notify.push('Title is required', undefined, true);
    if (!newTypeId) return notify.push('Document type is required', undefined, true);
    try {
      const payload = { title: newTitle, type_id: newTypeId, language: newLang, abstract: newAbstract };
      const res = await DocumentsApi.createDocument(payload);
      notify.push('Document created', 3);
      // refresh list and select created document if available
      const list = await DocumentsApi.getAllDocuments();
      setDocuments(Array.isArray(list) ? list : []);
      // try to select by returned id
      const did = res && (res.document_id || res.documentId || res.id);
      if (did) setSelectedDocId(Number(did));
      closeCreate();
    } catch (err: any) {
      notify.push(String(err?.message || err), undefined, true);
    }
  };

  // small per-field save helper to update document
  const saveField = async (field: string, value: any) => {
    if (!selectedDocId) return;
    try {
      const payload: any = {};
      payload[field] = value;
  const updated = await DocumentsApi.updateDocument(Number(selectedDocId), payload);
      // If backend returned the updated document, use it to update local UI immediately
      if (updated && typeof updated === 'object') {
        // If backend returned updated document, verify that the requested field was applied
        const backendValue = (updated as any)[field];
        const requested = payload[field];
        // comparison of requested vs backend value (no debug logs)
        const equal = (backendValue === requested) || (backendValue == null && requested == null);
        if (!equal) {
          // Backend did not apply requested change. Notify and do not accept as success.
          notify.push(`Failed to apply ${field} change on server`, undefined, true);
          // still update documents list entry with server version so UI reflects truth
          setDocuments(prev => {
            try {
              if (!Array.isArray(prev)) return prev;
              const copy = prev.slice();
              const idx = copy.findIndex(d => Number(d.document_id) === Number(selectedDocId));
              if (idx >= 0) copy[idx] = updated;
              return copy;
            } catch (e) { return prev; }
          });
          return false;
        }
        setSelectedDoc(updated as any);
        // also update documents list (replace entry)
        setDocuments(prev => {
          try {
            if (!Array.isArray(prev)) return prev;
            const copy = prev.slice();
            const idx = copy.findIndex(d => Number(d.document_id) === Number(selectedDocId));
            if (idx >= 0) copy[idx] = updated;
            return copy;
          } catch (e) { return prev; }
        });
      } else {
        // fallback: refresh list
        const list = await DocumentsApi.getAllDocuments();
        setDocuments(Array.isArray(list) ? list : []);
        notify.push('Saved', 2);
      }
      notify.push('Saved', 2);
      return true;
      } catch (err: any) {
      // Debug: log error details to browser console
      console.error('[Mentor] saveField -> error', { document_id: selectedDocId, field, error: err });
      notify.push(String(err?.message || err), undefined, true);
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedDocId) return;
    try {
      await DocumentsApi.deleteDocument(Number(selectedDocId));
      notify.push('Document deleted', 3);
      const list = await DocumentsApi.getAllDocuments();
      setDocuments(Array.isArray(list) ? list : []);
      setSelectedDocId(null);
    } catch (err: any) {
      notify.push(String(err?.message || err), undefined, true);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h2>Mentor Panel</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <button
            className="btn btn-primary"
            onClick={() => setDocumentFinderOpen(true)}
            style={{ 
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            {selectedDoc ? selectedDoc.title : 'SELECT DOCUMENT'}
          </button>
          {selectedDoc && (
            <button
              className="btn btn-ghost"
              onClick={() => setDocumentFinderOpen(true)}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              CHANGE DOCUMENT
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="accent-btn" onClick={openCreate}>Create document</button>
          <button className="btn-action" onClick={async () => { 
            const list = await DocumentsApi.getAllDocuments(); 
            setDocuments(Array.isArray(list) ? list : []); 
            await reloadWorkflowHistory();
          }}>Refresh</button>
        </div>
      </div>

      {/* Create modal (simple) */}
      {creating && (
        <div className="edit-modal-backdrop">
          <div className="edit-modal">
            <h3 style={{ textAlign: 'center', marginTop: 0, marginBottom: 8 }}>Create document</h3>
            <div className="create-form-grid auth-form">
              <div className="col">
                <label className="auth-label">Title</label>
                <input className="auth-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>

              <div className="create-compact-row">
                <div className="col" style={{ flex: '1 1 220px' }}>
                  <label className="auth-label">Language</label>
                  <select className="auth-input compact-select" value={newLang} onChange={e => setNewLang(e.target.value as any)}>
                    <option value="hr">hr</option>
                    <option value="en">en</option>
                  </select>
                </div>
                <div className="col" style={{ flex: '2 1 320px' }}>
                  <label className="auth-label">Type</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className="auth-input compact-select" value={newTypeId ?? ''} onChange={e => setNewTypeId(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">-- select type --</option>
                      {documentTypes.map(dt => (
                        <option key={dt.type_id} value={dt.type_id}>{dt.type_name}</option>
                      ))}
                    </select>
                    <button className="btn btn-ghost" type="button" onClick={() => {
                      const sel = documentTypes.find(d => d.type_id === newTypeId);
                      if (!sel) return notify.push('Select a document type first', undefined, true);
                      notify.push(sel.description || 'No description available', 8);
                    }}>ⓘ</button>
                  </div>
                </div>
              </div>

              <div className="col">
                <label className="auth-label">Abstract</label>
                <textarea className="auth-input" value={newAbstract} onChange={e => setNewAbstract(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn btn-ghost" onClick={closeCreate}>Cancel</button>
                <button className="btn btn-primary" onClick={doCreate}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard area */}
      {!selectedDoc && (
        <div style={{ padding: 24, border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--muted)' }}>
          <p>No document selected. Use the selector above or create a new document.</p>
        </div>
      )}

      {selectedDoc && (
        <>
          {/* Status alert banner based on document status */}
          {(() => {
            const status = selectedDoc.status;
            const reviewer = getUnderReviewUser();
            
            // under_review - urgent yellow alert
            if (status === 'under_review') {
              return (
                <div
                  className="glass-panel"
                  style={{
                    padding: '1rem 1.5rem',
                    marginBottom: '1.5rem',
                    background: 'rgba(255, 184, 77, 0.15)',
                    border: '2px solid var(--warning)',
                    borderRadius: 12,
                    boxShadow: '0 4px 24px rgba(255, 184, 77, 0.3), 0 0 0 1px rgba(255, 184, 77, 0.2)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--warning)', marginBottom: '0.25rem' }}>
                        DOCUMENT UNDER REVIEW
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        Document was sent for review by <strong>{reviewer?.userName || 'Unknown'}</strong>. 
                        Any changes to the document are not possible until one of the mentors grades or returns the document to draft!
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            // graded - blue info banner
            if (status === 'graded') {
              return (
                <div
                  className="glass-panel"
                  style={{
                    padding: '0.875rem 1.25rem',
                    marginBottom: '1rem',
                    background: 'rgba(var(--accent-rgb), 0.12)',
                    border: '1px solid var(--accent)',
                    borderRadius: 8,
                    boxShadow: '0 2px 12px rgba(var(--accent-rgb), 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📝</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                      <strong>Document Graded:</strong> This document has been graded with a score of <strong>{selectedDoc.grade ?? 'N/A'}</strong>.
                    </div>
                  </div>
                </div>
              );
            }
            
            // submitted - orange info banner
            if (status === 'submitted') {
              return (
                <div
                  className="glass-panel"
                  style={{
                    padding: '0.875rem 1.25rem',
                    marginBottom: '1rem',
                    background: 'rgba(255, 152, 0, 0.12)',
                    border: '1px solid #ff9800',
                    borderRadius: 8,
                    boxShadow: '0 2px 12px rgba(255, 152, 0, 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📤</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                      <strong>Document Submitted:</strong> This document has been submitted to the faculty.
                    </div>
                  </div>
                </div>
              );
            }
            
            // finished - green success banner
            if (status === 'finished') {
              return (
                <div
                  className="glass-panel"
                  style={{
                    padding: '0.875rem 1.25rem',
                    marginBottom: '1rem',
                    background: 'rgba(var(--success-rgb), 0.12)',
                    border: '1px solid var(--success)',
                    borderRadius: 8,
                    boxShadow: '0 2px 12px rgba(var(--success-rgb), 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>✅</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                      <strong>Document Finished:</strong> Faculty has accepted this document.
                    </div>
                  </div>
                </div>
              );
            }
            
            return null;
          })()}

        <div className="mentor-grid">
          <div>
            <div className="glass-panel profile-card mentor-details-card" style={{ padding: 12, margin: '0 auto' }}>
              <h3 style={{ marginTop: 0 }}>Document details</h3>
              <div style={{ display: 'grid', gap: 12, justifyItems: 'stretch', textAlign: 'center' }}>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Document ID</div>
                  <div><strong>{selectedDoc.document_id}</strong></div>
                </div>
                <div>
                  <label className="auth-label">Title</label>
                  <input className="auth-input" defaultValue={selectedDoc.title || ''} onBlur={e => saveField('title', e.target.value)} />
                </div>
                <div>
                  <label className="auth-label">Type</label>
                  <div className="type-row" style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                    <div className="type-half type-select-wrap">
                      <select className="auth-input type-select" value={selectedDoc.type_id ?? ''} disabled={savingType} onChange={async e => {
                        const newVal = e.target.value ? Number(e.target.value) : null;
                        // optimistic UI update so the select shows the new value immediately
                        const prevVal = selectedDoc?.type_id ?? null;
                        setSelectedDoc((prev: any) => prev ? ({ ...prev, type_id: newVal }) : prev);
                        try {
                          setSavingType(true);
                          const ok = await saveField('type_id', newVal);
                          if (!ok) {
                            // rollback optimistic change
                            setSelectedDoc((prev: any) => prev ? ({ ...prev, type_id: prevVal }) : prev);
                          }
                        } finally {
                          setSavingType(false);
                        }
                      }}>
                        <option value="">-- select type --</option>
                        {documentTypes.map(dt => (
                          <option key={dt.type_id} value={dt.type_id}>{dt.type_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="type-half type-info-wrap">
                      <button className="btn btn-ghost" type="button" onClick={() => {
                        const sel = documentTypes.find(d => Number(d.type_id) === Number(selectedDoc.type_id));
                        if (!sel) return notify.push('Select a document type first', undefined, true);
                        notify.push(sel.description || 'No description available', 8);
                      }}>ⓘ</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="auth-label">Abstract</label>
                  <textarea className="auth-input" defaultValue={selectedDoc.abstract || ''} onBlur={e => saveField('abstract', e.target.value)} />
                </div>
                <div>
                  <label className="auth-label">Language</label>
                  <select className="auth-input lang-select" defaultValue={selectedDoc.language || 'hr'} onChange={e => saveField('language', e.target.value)}>
                    <option value="hr">hr</option>
                    <option value="en">en</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Status</label>
                  <div className="status-display auth-input" title="Status is read-only in this panel">{selectedDoc.status || 'draft'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Compiled PDF path on server</div>
                  <div style={{ fontSize: '0.9em', wordBreak: 'break-all' }}>{selectedDoc.compiled_pdf_path || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Created by</div>
                  <div>{(() => {
                    const id = Number(selectedDoc.created_by || 0);
                    const nm = usersMap[id];
                    return nm ? `${nm} (${id})` : String(selectedDoc.created_by);
                  })()}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Created at</div>
                  <div>{formatDate(selectedDoc.created_at)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Updated at</div>
                  <div>{formatDate(selectedDoc.updated_at)}</div>
                </div>
                <div className="mentor-action-row" style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-action btn-render" onClick={() => { DocumentsApi.renderDocument(Number(selectedDocId)).then(() => notify.push('Render started', 3)).catch((e) => notify.push(String(e), undefined, true)); }}>Render</button>
                  <button className="btn btn-danger" onClick={() => { setConfirmTitle('Confirm DELETE action'); setConfirmQuestion('Are you sure you want to delete this document?'); setConfirmAction(() => handleDelete); setConfirmOpen(true); }}>Delete</button>
                </div>
              </div>
            </div>

                {/* Tasks panel */}
            <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
              <h3>Document tasks</h3>
              {docTasks.length === 0 ? <div style={{ color: 'var(--muted)' }}>No tasks for this document.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {docTasks.map((t: any, idx: number) => {
                    const creatorId = Number(t.created_by || t.creator_id || 0);
                    const assigneeId = Number(t.assigned_to || t.assignee_id || 0);
                    const creatorName = usersMap[creatorId] || (t.created_by_name || t.creator_name) || (creatorId ? String(creatorId) : 'N/A');
                    const assigneeName = usersMap[assigneeId] || (t.assigned_to_name || t.assignee_name) || (assigneeId ? String(assigneeId) : 'Unassigned');
                    // support multiple possible field names returned by backend / DB schema
                    const from = t.from || t.start || t.start_at || t.start_at_iso || t.from_at || t.from_at_iso || t.task_from || t.task_from_iso;
                    const due = t.due || t.due_at || t.end || t.due_at_iso || t.task_due || t.task_due_iso || t.due_at || t.due_at_iso;
                    // Show task timestamps without seconds (hours and minutes are sufficient)
                    const prettyFrom = formatDate(from, false);
                    const prettyDue = formatDate(due, false);
                    const status = String(t.task_status || t.status || 'open');
                    const statusBg = status === 'closed' ? 'linear-gradient(90deg,var(--danger),rgba(var(--danger-rgb,214,69,69),0.9))' : 'linear-gradient(90deg,var(--primary),var(--accent))';
                    const statusColor = 'var(--panel)';
                    // less prominent than files: smaller left accent and fainter bg
                    const bg = `rgba(var(--accent-rgb), ${Math.max(0.02, 0.04 - (idx % 5) * 0.005)})`;
                    return (
                      <div key={t.task_id} style={{ padding: 10, borderRadius: 8, background: bg, borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--accent)' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t.task_title}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                            {`Created by ${creatorName} — Assigned to ${assigneeName}`}
                          </div>
                          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                            {`From: ${prettyFrom} — Due: ${prettyDue}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ background: statusBg, color: statusColor, padding: '6px 10px', borderRadius: 14, fontWeight: 800, fontSize: 12, minWidth: 84, textAlign: 'center' }}>{status.toUpperCase()}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t.task_id ? `TaskID: ${t.task_id}` : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

                {/* Versions panel */}
                <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
                  <h3>Document renders</h3>
                  {docVersions.length === 0 ? <div>No versions available.</div> : (
                    <div>
                      {docVersions.slice().reverse().slice(0, rendersToShow).map(v => {
                        const editorId = Number(v.edited_by || v.edited_by_id || v.edited_by_user_id || 0);
                        let editorName = usersMap[editorId];
                        if (!editorName) {
                          const disp = v.edited_by_display_name || v.edited_by_name;
                          if (disp) editorName = String(disp);
                          else {
                            const first = v.edited_by_first || v.first_name || v.firstName || '';
                            const last = v.edited_by_last || v.last_name || v.lastName || '';
                            const combined = `${first} ${last}`.trim();
                            editorName = combined || (editorId ? String(editorId) : 'N/A');
                          }
                        }
                        return (
                        <div key={v.version_id} className="task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', marginBottom: 8, borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{`Version ${v.version_number}`}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{`Rendered by ${editorName} @ ${new Date(v.edited_at).toLocaleString()}`}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-action" type="button" onClick={() => fetchAndDownload(`/api/documents/${selectedDocId}/versions/${v.version_id}/download`, `v${v.version_number}.pdf`)}>Download</button>
                          </div>
                        </div>
                      );
                      })}
                      {docVersions.length > rendersToShow && (
                        <button className="btn btn-secondary" style={{ marginTop: 8, width: '100%' }} onClick={() => setRendersToShow(prev => prev + 3)}>Load more</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Files panel */}
                <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
                  <h3>Files</h3>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <label className="auth-label" style={{ margin: 0 }}>Upload document file (allowed types are pdf and images):</label>

                    {/* Hidden native file input - controlled via styled button */}
                    <input style={{ display: 'none' }} type="file" id="file-upload-input" onChange={(e) => {
                      const f = (e.target as HTMLInputElement).files?.[0] ?? null;
                      setUploadFileName(f ? f.name : '');
                    }} />

                    {/* Choose file button */}
                    <label htmlFor="file-upload-input" className="accent-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                      <span>{uploadFileName ? 'Change file' : 'Choose file'}</span>
                    </label>

                    {/* filename preview */}
                    <div style={{ minWidth: 220, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)' }} title={uploadFileName}>{uploadFileName || 'No file selected'}</div>

                    {/* Upload button */}
                    <button className={`btn ${uploading ? 'btn-disabled' : 'btn-primary'}`} disabled={uploading} onClick={async () => {
                      const el = document.getElementById('file-upload-input') as HTMLInputElement | null;
                      if (!el || !el.files || el.files.length === 0) return notify.push('Select a file first', undefined, true);
                      const file = el.files[0];
                      const fd = new FormData();
                      // append document_id first to ensure server-side middleware sees it
                      fd.append('document_id', String(selectedDocId));
                      fd.append('file', file);
                      let res: Response | null = null;
                      try {
                        setUploading(true);
                        res = await fetch('/api/files/upload/document', { method: 'POST', body: fd, credentials: 'include' });
                      } catch (netErr: any) {
                        console.error('[Mentor] file upload network error', netErr);
                        notify.push(`Upload failed: ${String(netErr?.message || netErr)}`, undefined, true);
                        setUploading(false);
                        return;
                      }

                      let parsed: any = {};
                      try {
                        parsed = await res.clone().json().catch(() => ({}));
                      } catch (e) {
                        parsed = {};
                      }

                      if (!res.ok) {
                        // Try to get plain text fallback for non-JSON errors
                        let text = '';
                        try { text = await res.text().catch(() => ''); } catch (e) { text = ''; }
                        const msg = (parsed && (parsed.error || parsed.message)) || text || `Upload failed (status ${res.status})`;
                        console.error('[Mentor] file upload failed', { status: res.status, json: parsed, text });
                        notify.push(String(msg), undefined, true);
                        setUploading(false);
                        return;
                      }

                      notify.push('File uploaded', 3);
                      setUploadFileName('');
                      try {
                        const files = await DocumentsApi.getFiles(Number(selectedDocId));
                        setDocFiles(Array.isArray(files) ? files : []);
                      } catch (e: any) {
                        console.error('[Mentor] failed to refresh file list after upload', e);
                      }
                      setUploading(false);
                      // clear native input so selecting same file again triggers change
                      try { if (el) el.value = ''; } catch {}
                    }}>{uploading ? 'Uploading…' : 'Upload'}</button>
                  </div>
                  {docFiles.length === 0 ? <div style={{ color: 'var(--muted)' }}>No uploaded files</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {docFiles.map((f, idx) => {
                        const uploaderId = Number(f.uploaded_by || 0);
                        const uploaderName = usersMap[uploaderId] || String(uploaderId || 'N/A');
                        const prettySize = (typeof f.file_size === 'number') ? `${(f.file_size / (1024*1024)).toFixed(2)} MB` : (f.file_size ? `${(Number(f.file_size) / (1024*1024)).toFixed(2)} MB` : '—');
                        const alpha = (0.04 + (idx % 6) * 0.02).toFixed(3);
                        const bg = `rgba(var(--accent-rgb), ${alpha})`;
                        return (
                          <div key={f.file_id} style={{ padding: 10, borderRadius: 6, background: bg, borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '6px solid var(--accent)' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <div style={{ fontWeight: 600 }}>{f.file_name || `file_${f.file_id}`}</div>
                              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                                {`${f.file_path || ''} — Uploaded by ${uploaderName} @ ${formatDate(f.uploaded_at)} — with file size: ${prettySize} — FileID: ${f.file_id} — for document with id ${f.document_id ?? selectedDocId}`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                              <button className="btn btn-action" type="button" onClick={() => fetchAndDownload(`/api/files/download/${f.file_id}`, f.file_name || `file_${f.file_id}`)}>Download</button>
                              <button className="btn btn-danger" onClick={() => {
                                // use confirmation box
                                setConfirmTitle('Confirm file deletion');
                                setConfirmQuestion(`Delete file ${f.file_name || f.file_id}? This will remove the record and the file from server.`);
                                setConfirmAction(() => async () => {
                                  try {
                                    const res = await DocumentsApi.deleteFile(Number(f.file_id));
                                    notify.push('File deleted', 2);
                                  } catch (e: any) {
                                    notify.push(String(e?.message || e), undefined, true);
                                  } finally {
                                    const files = await DocumentsApi.getFiles(Number(selectedDocId));
                                    setDocFiles(Array.isArray(files) ? files : []);
                                  }
                                });
                                setConfirmOpen(true);
                              }}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
          </div>

          <div>
            <div className="glass-panel profile-card" style={{ padding: 12 }}>
              <h3>Editors</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="btn-action" onClick={() => setUserFinderOpen(true)}>Add editor</button>
                <button className="btn-action" onClick={async () => { const v = await DocumentsApi.getEditors(Number(selectedDocId)); setEditors(Array.isArray(v) ? v : []); }}>Refresh</button>
              </div>
              <div>
                {editors.length === 0 ? <div style={{ color: 'var(--muted)' }}>No editors</div> : (
                  <ul>
                    {editors.map(ed => {
                      const uid = Number(ed.user_id || ed.id || 0);
                      const display = usersMap[uid] || (ed.display_name || ed.name || '');
                      const nameLabel = display ? `${display} (${uid})` : String(uid || '');
                      const roleLabel = ed.role ? ` - ${ed.role}` : '';
                      
                      // Role hierarchy: mentor > owner > editor > viewer
                      const roleHierarchy: Record<string, number> = { mentor: 4, owner: 3, editor: 2, viewer: 1 };
                      const currentUserEditor = editors.find(e => Number(e.user_id || e.id) === user?.id);
                      const currentUserRoleLevel = roleHierarchy[currentUserEditor?.role || 'viewer'] || 0;
                      const editorRoleLevel = roleHierarchy[ed.role || 'viewer'] || 0;
                      const canRemove = ed.role !== 'owner' && currentUserRoleLevel > editorRoleLevel;
                      
                      return (
                        <li key={`${uid}`}>
                          {nameLabel}{roleLabel}
                          {canRemove && (
                            <button className="btn btn-ghost" onClick={() => { setConfirmAction(() => async () => { await DocumentsApi.removeEditor(Number(selectedDocId), { user_id: uid }); const v = await DocumentsApi.getEditors(Number(selectedDocId)); setEditors(Array.isArray(v) ? v : []); notify.push('Editor removed', 2); }); setConfirmOpen(true); }}>Remove</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
              <h3>Workflow</h3>
              {(() => {
                const latestEvent = workflowHistory.length > 0 ? workflowHistory[workflowHistory.length - 1] : null;
                const currentStatus = selectedDoc?.status || 'draft';
                const lastChangedBy = latestEvent ? usersMap[latestEvent.changed_by] || `User ${latestEvent.changed_by}` : '—';
                const lastChangedAt = latestEvent ? formatDate(latestEvent.changed_at, false) : '—';
                return (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 6 }}>
                      <strong style={{ color: 'var(--text)' }}>CURRENT DOCUMENT STATUS:</strong>{' '}
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{currentStatus}</span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                      <strong>LAST CHANGED BY:</strong> {lastChangedBy} @ {lastChangedAt}
                    </div>
                  </div>
                );
              })()}
              <button className="btn-action" onClick={() => setWorkflowHistoryOpen(true)}>SEE WORKFLOW HISTORY</button>
            </div>

            {/* Grade Document Card */}
            <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
              <h3>Grade Document</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                Assign a grade to this document and set its status. The grade can range from 0 to 100 points.
              </p>
              <button 
                className={selectedDoc.status === 'under_review' ? 'btn-action grade-pulse' : 'btn btn-primary'}
                onClick={handleGradeDocumentClick}
                style={selectedDoc.status === 'under_review' ? {
                  boxShadow: '0 0 20px rgba(var(--accent-rgb), 0.6)',
                  animation: 'pulse 2s infinite'
                } : {}}
              >
                GRADE THIS DOCUMENT
              </button>

              {/* Show SUBMITTED button if status is graded */}
              {selectedDoc.status === 'graded' && (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        await fetch(`/api/documents/${selectedDoc.document_id}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ status: 'submitted' })
                        });
                        notify.push('Document status changed to submitted', 5);
                        // Reload workflow history to update banner
                        await reloadWorkflowHistory();
                        // Reload documents to update sidebar and selectedDoc
                        DocumentsApi.getAllDocuments()
                          .then((list: any[]) => setDocuments(Array.isArray(list) ? list : []))
                          .catch((err: any) => notify.push(String(err), undefined, true));
                      } catch (err: any) {
                        notify.push(String(err), undefined, true);
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #ff8c00, #ffa500)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  >
                    CHANGE DOCUMENT STATUS TO SUBMITTED
                  </button>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>
                    Submitted status means the document has been submitted to faculty for final review.
                  </p>
                </div>
              )}

              {/* Show FINISH button if status is submitted */}
              {selectedDoc.status === 'submitted' && (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        await fetch(`/api/documents/${selectedDoc.document_id}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ status: 'finished' })
                        });
                        notify.push('Document status changed to finished', 5);
                        // Reload workflow history to update banner
                        await reloadWorkflowHistory();
                        // Reload documents to update sidebar and selectedDoc
                        DocumentsApi.getAllDocuments()
                          .then((list: any[]) => setDocuments(Array.isArray(list) ? list : []))
                          .catch((err: any) => notify.push(String(err), undefined, true));
                      } catch (err: any) {
                        notify.push(String(err), undefined, true);
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #28a745, #34d058)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  >
                    FINISH DOCUMENT
                  </button>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>
                    Finished status means faculty has accepted and finalized this document.
                  </p>
                </div>
              )}

              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse {
                  0%, 100% { box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.6); }
                  50% { box-shadow: 0 0 30px rgba(var(--accent-rgb), 0.9); }
                }
                .grade-pulse:hover {
                  transform: scale(1.05);
                  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.6) !important;
                }
              ` }} />
            </div>

            <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
              <h3>Audit Log History</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 12 }}>
                View all actions performed on this document by users.
              </p>
              <button className="btn-action" onClick={() => setAuditLogOpen(true)}>SEARCH AUDIT LOG FOR THIS DOCUMENT</button>
            </div>
          </div>
        </div>
        </>
      )}

      <ConfirmationBox
        title={confirmTitle}
        question={confirmQuestion}
        isOpen={confirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          if (confirmAction) {
            const p = confirmAction();
            if (p && typeof (p as any).catch === 'function') {
              (p as Promise<any>).catch((e: any) => notify.push(String(e), undefined, true));
            }
          }
          setConfirmAction(null);
        }}
        onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }}
      />

      <ConfirmationBox
        title="Confirm Grading"
        question={preGradeConfirmMessage}
        isOpen={preGradeConfirmOpen}
        onConfirm={() => {
          setPreGradeConfirmOpen(false);
          setDocumentGraderOpen(true);
        }}
        onCancel={() => setPreGradeConfirmOpen(false)}
      />

      {selectedDoc && (
        <DocumentGrader
          isOpen={documentGraderOpen}
          onClose={() => setDocumentGraderOpen(false)}
          documentId={selectedDoc.document_id}
          currentGrade={selectedDoc.grade}
          currentStatus={selectedDoc.status}
          onGradeSuccess={async () => {
            setDocumentGraderOpen(false);
            // Reload workflow history to update banner
            await reloadWorkflowHistory();
            // Reload documents list which will trigger selectedDoc update via useEffect
            DocumentsApi.getAllDocuments()
              .then((list: any[]) => setDocuments(Array.isArray(list) ? list : []))
              .catch((err: any) => notify.push(String(err), undefined, true));
          }}
        />
      )}

      <UserFinder open={userFinderOpen} onClose={() => setUserFinderOpen(false)} onSelect={async (uid) => {
        try {
          await DocumentsApi.addEditor(Number(selectedDocId), { user_id: uid, role: 'editor' });
          const v = await DocumentsApi.getEditors(Number(selectedDocId));
          setEditors(Array.isArray(v) ? v : []);
          notify.push('Editor added', 2);
        } catch (e: any) { notify.push(String(e?.message || e), undefined, true); }
        setUserFinderOpen(false);
      }} />

      <WorkflowHistoryModal
        open={workflowHistoryOpen}
        onClose={() => setWorkflowHistoryOpen(false)}
        documentId={selectedDocId}
        usersMap={usersMap}
      />

      <AuditLogModal
        open={auditLogOpen}
        onClose={() => setAuditLogOpen(false)}
        documentId={selectedDocId}
        usersMap={usersMap}
      />

      <DocumentFinder
        open={documentFinderOpen}
        onClose={() => setDocumentFinderOpen(false)}
        onSelect={async (documentId) => {
          setSelectedDocId(documentId);
          // Persist selection to session
          try {
            if (sessionCtx && typeof sessionCtx.patchSession === 'function') {
              await sessionCtx.patchSession({ last_document_id: documentId });
            }
          } catch (err) {
            // ignore patch errors silently
          }
        }}
      />
    </div>
  );
}
