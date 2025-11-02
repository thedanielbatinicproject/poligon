import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';
import DocumentsApi from '../lib/documentsApi';
import * as TasksApi from '../lib/tasksApi';
import UserFinder from '../components/UserFinder';
import ConfirmationBox from '../components/ConfirmationBox';
import { useSocket } from '../components/SocketProvider';
import WorkflowHistoryModal from '../components/WorkflowHistoryModal';

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
    if (existing && (!selectedDoc || Number(selectedDoc.document_id) !== Number(existing.document_id))) {
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
  // we depend on selectedDocId and usersMap may change but that's okay
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
          <label style={{ color: 'var(--muted)' }}>Select document:</label>
          <select
            className="auth-input doc-select"
            value={selectedDocId ?? ''}
            onChange={async (e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              setSelectedDocId(v);
              // Persist selection to session (so it survives refresh)
              try {
                if (sessionCtx && typeof sessionCtx.patchSession === 'function') await sessionCtx.patchSession({ last_document_id: v });
              } catch (err) {
                // ignore patch errors silently
              }
            }}
          >
            <option value="">(All / Global)</option>
            {documents.map(d => (
              <option key={d.document_id} value={d.document_id}>{d.title}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="accent-btn" onClick={openCreate}>Create document</button>
          <button className="btn-action" onClick={async () => { const list = await DocumentsApi.getAllDocuments(); setDocuments(Array.isArray(list) ? list : []); }}>Refresh</button>
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
                      return (
                        <li key={`${uid}`}>
                          {nameLabel}{roleLabel}
                          {ed.role !== 'owner' && (
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
          </div>
        </div>
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
    </div>
  );
}
