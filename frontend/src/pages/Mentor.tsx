import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/session';
import { useNotifications } from '../lib/notifications';
import DocumentsApi from '../lib/documentsApi';
import * as TasksApi from '../lib/tasksApi';
import UserFinder from '../components/UserFinder';
import ConfirmationBox from '../components/ConfirmationBox';

export default function Mentor() {
  const sessionCtx = useSession();
  const user = sessionCtx.user;
  const session = sessionCtx.session;
  const notify = useNotifications();

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

  // tasks for document
  const [docTasks, setDocTasks] = useState<any[]>([]);
  const [docVersions, setDocVersions] = useState<any[]>([]);
  const [docFiles, setDocFiles] = useState<any[]>([]);
  const [savingType, setSavingType] = useState(false);

  // helper: format timestamp to DD.MM.YYYY.@HH:MM:SS
  const formatDate = (ts: any) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      const pad = (n: number) => (n < 10 ? '0' + n : String(n));
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} @ ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch (e) { return String(ts); }
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
  // we depend on selectedDocId and usersMap may change but that's okay
  }, [selectedDocId]);

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
            <h3>Create document</h3>
            <div className="form-row">
              <label className="auth-label">Title</label>
              <input className="auth-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="form-row">
                <label className="auth-label">Language</label>
              <select className="auth-input" value={newLang} onChange={e => setNewLang(e.target.value as any)}>
                <option value="hr">hr</option>
                <option value="en">en</option>
              </select>
            </div>
              <div className="form-row">
                <label className="auth-label">Type</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="auth-input" value={newTypeId ?? ''} onChange={e => setNewTypeId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">-- select type --</option>
                    {documentTypes.map(dt => (
                      <option key={dt.type_id} value={dt.type_id}>{dt.type_name}</option>
                    ))}
                  </select>
                  <button className="btn btn-ghost" type="button" onClick={() => {
                    const sel = documentTypes.find(d => d.type_id === newTypeId);
                    if (!sel) return notify.push('Select a document type first', undefined, true);
                    // push notification with description
                    notify.push(sel.description || 'No description available', 8);
                  }}>ⓘ</button>
                </div>
              </div>
            <div className="form-row">
              <label className="auth-label">Abstract</label>
              <textarea className="auth-input" value={newAbstract} onChange={e => setNewAbstract(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={closeCreate}>Cancel</button>
              <button className="btn btn-primary" onClick={doCreate}>Create</button>
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
                  <div style={{ color: 'var(--muted)' }}>Compiled PDF</div>
                  <div>{selectedDoc.compiled_pdf_path ? <a href={selectedDoc.compiled_pdf_path} target="_blank" rel="noreferrer">Download</a> : '—'}</div>
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
                  <button className="btn btn-action" onClick={() => { DocumentsApi.renderDocument(Number(selectedDocId)).then(() => notify.push('Render started', 3)).catch((e) => notify.push(String(e), undefined, true)); }}>Render</button>
                  <button className="btn btn-danger" onClick={() => { setConfirmAction(() => handleDelete); setConfirmOpen(true); }}>Delete</button>
                </div>
              </div>
            </div>

                {/* Tasks panel */}
            <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
              <h3>Document tasks</h3>
              {docTasks.length === 0 ? <div>No tasks for this document.</div> : (
                <ul>
                  {docTasks.map(t => <li key={t.task_id}>{t.task_title} — {t.task_status}</li>)}
                </ul>
              )}
            </div>

                {/* Versions panel */}
                <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
                  <h3>Document versions</h3>
                  {docVersions.length === 0 ? <div>No versions available.</div> : (
                    <ul>
                      {docVersions.map(v => (
                        <li key={v.version_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>{`v${v.version_number} — edited by ${v.edited_by || 'N/A'} @ ${new Date(v.edited_at).toLocaleString()}`}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <a className="btn btn-action" href={`/api/documents/${selectedDocId}/versions/${v.version_id}/download`} target="_blank" rel="noreferrer">Download</a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Files panel */}
                <div className="glass-panel profile-card" style={{ padding: 12, marginTop: 12 }}>
                  <h3>Files</h3>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <label className="auth-label" style={{ margin: 0 }}>Upload document file (pdf/tex/bib):</label>
                    <input type="file" id="file-upload-input" />
                    <button className="btn" onClick={async () => {
                      const el = document.getElementById('file-upload-input') as HTMLInputElement | null;
                      if (!el || !el.files || el.files.length === 0) return notify.push('Select a file first', undefined, true);
                      const file = el.files[0];
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('document_id', String(selectedDocId));
                      try {
                        const res = await fetch('/api/files/upload/document', { method: 'POST', body: fd, credentials: 'include' });
                        const body = await res.json().catch(() => ({}));
                        if (!res.ok) return notify.push(String(body && body.error ? body.error : 'Upload failed'), undefined, true);
                        notify.push('File uploaded', 3);
                        const files = await DocumentsApi.getFiles(Number(selectedDocId));
                        setDocFiles(Array.isArray(files) ? files : []);
                      } catch (e: any) { notify.push(String(e?.message || e), undefined, true); }
                    }}>Upload</button>
                  </div>
                  {docFiles.length === 0 ? <div style={{ color: 'var(--muted)' }}>No uploaded files</div> : (
                    <ul>
                      {docFiles.map(f => (
                        <li key={f.file_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>{`${f.file_type || ''} — ${String(f.file_path || f.file_id).split('/').pop() || f.file_id} — by ${f.uploaded_by || 'N/A'}`}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <a className="btn btn-action" href={`/api/files/download/${f.file_id}`} target="_blank" rel="noreferrer">Download</a>
                            <button className="btn btn-ghost" onClick={async () => {
                              try {
                                await DocumentsApi.deleteFile(Number(f.file_id));
                                notify.push('File deleted', 2);
                                const files = await DocumentsApi.getFiles(Number(selectedDocId));
                                setDocFiles(Array.isArray(files) ? files : []);
                              } catch (e: any) { notify.push(String(e?.message || e), undefined, true); }
                            }}>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
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
              <button className="btn-action" onClick={() => notify.push('Open workflow history (not yet implemented)', 3)}>SEE WORKFLOW HISTORY</button>
              <div style={{ marginTop: 8, color: 'var(--muted)' }}>Workflow history viewer will open here (modal) — timeline newest first.</div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationBox
        title="Confirm action"
        question="Are you sure?"
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
    </div>
  );
}
