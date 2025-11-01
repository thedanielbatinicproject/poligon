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
    const d = documents.find((x) => Number(x.document_id) === Number(selectedDocId)) || null;
    setSelectedDoc(d);
    // load editors and ensure user labels are available
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
  }, [selectedDocId, documents]);

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
      await DocumentsApi.updateDocument(Number(selectedDocId), payload);
      notify.push('Saved', 2);
      const list = await DocumentsApi.getAllDocuments();
      setDocuments(Array.isArray(list) ? list : []);
    } catch (err: any) {
      notify.push(String(err?.message || err), undefined, true);
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 360px', gap: 12 }}>
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
                      <select className="auth-input type-select" value={selectedDoc.type_id ?? ''} onChange={e => { saveField('type_id', e.target.value ? Number(e.target.value) : null); }}>
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
