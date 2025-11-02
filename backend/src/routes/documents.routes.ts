import { Router, Request, Response } from 'express';
import path from 'path';
import { DocumentsService } from '../services/documents.service';
import { checkLogin, checkAdmin, checkMentor, checkStudent } from '../middleware/auth.middleware';
import { AuditService, AuditLogEntityType, AuditLogActionType } from '../services/audit.service';
import { createTempUrl, startOnlineRender, isRendering as isOnlineRendering } from '../render/onlineRenderer';
import { DocumentWorkflowService } from '../services/documentWorkflow.service';

const documentsRouter = Router();

// POST /api/documents/:document_id/render - Render document to PDF (creator/mentor, admin, editor)
documentsRouter.post('/:document_id/render', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const user_id = req.session.user_id;
  const role = req.session.role;
  if (!user_id || !role) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  try {
    // Load editors for diagnostics (keep errors non-fatal)
    const editorsForDoc = await DocumentsService.getDocumentEditors(document_id).catch((e) => {
      console.warn('[DEBUG] failed to load document editors', { document_id, err: e });
      return [] as any[];
    });
    // Brief debug summary (removed noisy full request debug above)
    console.debug('[DEBUG] render preflight', { document_id, user_id, role, editorsCount: editorsForDoc.length });

    // Only admin, a global mentor user, or a mentor assigned on this document can trigger
    const isMentor = await DocumentsService.isEditor(document_id, user_id, ['mentor']);
    if (role !== 'admin' && role !== 'mentor' && !isMentor) {
      console.warn('[DEBUG] render authorization failed', { document_id, user_id, role, isMentor });
      return res.status(403).json({ error: 'Only mentors of this document or admins can trigger rendering.' });
    }
    // create temporary public URL and start external renderer
    const temp = createTempUrl(document_id, user_id);
    if (temp.error) {
      console.debug('[DEBUG] render aborted - already rendering or token error', { document_id, err: temp.error });
      return res.status(409).json({ error: temp.error });
    }
    const token = temp.token!;
    // start async external render (spawns background job)
    const started = await startOnlineRender(token);
    console.debug('[DEBUG] startOnlineRender result', { document_id, started });
    if (!started || !started.started) {
      return res.status(500).json({ error: 'Failed to start render job.', details: started?.message });
    }
    return res.status(200).json({ message: 'Render job started.' });
  } catch (err) {
    console.error('[ERROR] /api/documents/:id/render', (err as any)?.stack || err);
    res.status(500).json({ error: 'Failed to process render request.', details: String((err as any)?.message || err) });
  }
});

// GET /api/documents/:document_id/render/status - returns whether render is in progress
documentsRouter.get('/:document_id/render/status', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const user_id = req.session.user_id;
  if (!user_id) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const { isRendering } = await Promise.resolve().then(() => require('../workers/renderWorker'));
    const online = isOnlineRendering(document_id);
    return res.status(200).json({ rendering: isRendering(document_id) || online });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch render status.', details: String((err as any)?.message || err) });
  }
});

// POST /api/documents - Create new document (admin/mentor only)
documentsRouter.post('/', checkLogin, async (req: Request, res: Response) => {
  const role = req.session.role;
  const user_id = req.session.user_id;
  if (role !== 'admin' && role !== 'mentor') {
    return res.status(403).json({ error: 'Only admin or mentor can create documents!' });
  }
  // Validate type_id exists and is valid
  const rawTypeId = req.body?.type_id;
  const typeId = typeof rawTypeId === 'number' ? rawTypeId : (rawTypeId ? Number(rawTypeId) : null);
  if (!typeId || isNaN(typeId)) {
    return res.status(400).json({ error: 'Invalid or missing type_id for document. Choose a valid document type.' });
  }
  const type = await DocumentsService.getDocumentTypeById(typeId);
  if (!type) {
    return res.status(400).json({ error: `Document type not found for type_id=${typeId}` });
  }

  try {
    const doc = await DocumentsService.createDocument({
      ...req.body,
      type_id: typeId,
      created_by: user_id
    });
    if (!doc) {
      return res.status(400).json({ error: 'Invalid document data or validation failed!' });
    }
    await AuditService.createAuditLog({
      user_id: Number(req.session.user_id),
      action_type: 'create',
      entity_type: 'document',
      entity_id: doc.document_id
    });
    res.status(201).json(doc);
  } catch (err: any) {
    console.error('[ERROR] Failed to create document:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Failed to create document!', details: String(err?.message || err) });
  }
});

// GET /api/documents/all - Get all documents for current user (owner/editor/mentor)
documentsRouter.get('/all', checkLogin, async (req: Request, res: Response) => {
  const user_id = req.session.user_id;
  if (!user_id) {
    return res.status(401).json({ error: 'User not logged in!' });
  }
  try {
    const roles = ['owner', 'editor', 'mentor'];
    let allDocs: any[] = [];
    for (const role of roles) {
      const docs = await DocumentsService.getUserDocumentsByRole(user_id, role);
      allDocs = allDocs.concat(docs);
    }
    // Remove duplicates if any (in case user has multiple roles on same document)
    const uniqueDocs = Object.values(
      allDocs.reduce((acc, doc) => {
        acc[doc.document_id] = doc;
        return acc;
      }, {} as Record<number, any>)
    );
    res.json(uniqueDocs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents from database.', details: err });
  }
});

// DELETE /api/documents/:document_id - Delete document by ID (admin: any, mentor: only owned)
documentsRouter.delete('/:document_id', checkLogin, async (req: Request, res: Response) => {
  const user_id = req.session.user_id;
  const role = req.session.role;
  const document_id = Number(req.params.document_id);
  if (!user_id || !role) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  try {
    const deleted = await DocumentsService.deleteDocument(document_id, role, user_id);
    if (!deleted) {
      return res.status(403).json({ error: 'User is not authorized to delete this document or document not found.' });
    }
    await AuditService.createAuditLog({
      user_id: Number(req.session.user_id),
      action_type: 'delete',
      entity_type: 'document',
      entity_id: document_id
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[ERROR] delete /api/documents/:id failed', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Failed to delete document even though user is authorized.', details: String(err?.message || err) });
  }
});

// PUT /api/documents/:document_id - Edit document details
// Only mentor can change title, status, language, grade
// Mentor or editor/owner can change abstract, latex_content
// type_id, compiled_pdf_path, created_by, created_at, updated_at cannot be changed
documentsRouter.put('/:document_id', checkLogin, async (req: Request, res: Response) => {
  const user_id = req.session.user_id;
  const role = req.session.role;
  const document_id = Number(req.params.document_id);
  if (!user_id || !role) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  try {
    const updatedDoc = await DocumentsService.editDocument(document_id, req.body, role, user_id);
    if (!updatedDoc) {
      return res.status(403).json({ error: 'Not authorized to edit this document or document not found.' });
    }
    await AuditService.createAuditLog({
        user_id: Number(req.session.user_id),
        action_type: 'edit',
        entity_type: 'document',
        entity_id: document_id
    });
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit document.', details: err });
  }
});

// GET /api/documents/:document_id/content - Get latex_content for a document
// Access rights: only editor, owner or mentor
documentsRouter.get('/:document_id/content', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const user_id = req.session.user_id;
  if (!user_id) {
    return res.status(401).json({ error: 'You are not authenticated!' });
  }
  try {
    // Check if user is editor/owner/mentor for this document
    const isAllowed = await DocumentsService.isEditor(document_id, user_id, ['editor', 'owner', 'mentor']);
    if (!isAllowed) {
      return res.status(403).json({ error: 'Not authorized to view latex_content for this document!' });
    }
    const doc = await DocumentsService.getDocumentById(document_id);
    if (!doc) {
      return res.status(404).json({ error: 'Document was not found in the database!' });
    }
    res.json({ latex_content: doc.latex_content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document content from database!', details: err });
  }
});

// PUT /api/documents/:document_id/content - Update latex_content for a document
// Only mentor, owner, or editor can update
documentsRouter.put('/:document_id/content', checkLogin, async (req: Request, res: Response) => {
  const user_id = req.session.user_id;
  const role = req.session.role;
  const document_id = Number(req.params.document_id);
  const { latex_content } = req.body;
  if (!user_id || !role) {
    return res.status(401).json({ error: 'You are not authenticated!' });
  }
  if (typeof latex_content !== 'string') {
    return res.status(400).json({ error: 'Invalid latex_content. Request body must be a latex string!' });
  }
  try {
    const updatedDoc = await DocumentsService.updateLatexContent(document_id, latex_content, role, user_id);
    if (!updatedDoc) {
      return res.status(403).json({ error: 'Not authorized to update latex_content or document not found!' });
    }
    const status = await DocumentsService.getDocumentStatus(document_id);
    if (status) {
      await DocumentWorkflowService.addWorkflowEvent(document_id, status, Number(req.session.user_id));
    }
    await AuditService.createAuditLog({
        user_id: Number(req.session.user_id),
        action_type: 'edit',
        entity_type: 'document',
        entity_id: document_id
    });
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document content in database!', details: err });
  }
});

// POST /api/documents/:document_id/editors - Add editor to document
// Pravo dodavanja: samo owner (creator) ili admin
documentsRouter.post('/:document_id/editors', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const added_by = req.session.user_id;
  const role = req.session.role;
  const { user_id, editor_role } = req.body; // user_id to add, editor_role ('editor', 'viewer', 'mentor')
  if (!added_by || !role) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (!user_id || !editor_role || !['editor','viewer','mentor'].includes(editor_role)) {
    return res.status(400).json({ error: 'Invalid user_id or editor_role.' });
  }
  try {
    const success = await DocumentsService.addEditor(document_id, user_id, editor_role, added_by);
    if (!success) {
      return res.status(403).json({ error: 'Not authorized to add editor for this document.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add editor.', details: err });
  }
});

// DELETE /api/documents/:document_id/editors - Remove editor from document
// Pravo micanja: samo owner (creator) ili admin

documentsRouter.delete('/:document_id/editors', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const requester_id = req.session.user_id;
  const role = req.session.role;
  const { user_id } = req.body; // user_id to remove
  if (!requester_id || !role) {
    return res.status(401).json({ error: 'You are not authenticated.' });
  }
  if (!user_id) {
    return res.status(400).json({ error: 'user_id that was sent in request body is invalid.' });
  }
  try {
    const success = await DocumentsService.removeEditor(document_id, user_id, requester_id);
    if (!success) {
      return res.status(403).json({ error: 'You are not authorized to remove editor for this document.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove editor.', details: err });
  }
});

// GET /api/documents/:document_id/editors - Get all editors for a document
documentsRouter.get('/:document_id/editors', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const user_id = req.session.user_id;
  const role = req.session.role;
  if (!user_id || !role) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  try {
    // Allow access if user is admin or is an editor/owner/mentor/viewer on the document
    const isAllowed =
      role === 'admin' ||
      await DocumentsService.isEditor(document_id, user_id, ['owner', 'editor', 'mentor', 'viewer']);
    if (!isAllowed) {
      return res.status(403).json({ error: 'You are not authorized to view editors for this document.' });
    }
    const editors = await DocumentsService.getDocumentEditors(document_id);
    res.status(200).json(editors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document editors.', details: err });
  }
});

// GET /api/documents/:document_id/versions - Get all versions for a document
documentsRouter.get('/:document_id/versions', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const user_id = req.session.user_id;
  const role = req.session.role;
  if (!user_id || !role) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  try {
    // Allow access if user is admin or is an editor/owner/mentor/viewer on the document
    const isAllowed =
      role === 'admin' ||
      await DocumentsService.isEditor(document_id, user_id, ['owner', 'editor', 'mentor', 'viewer']);
    if (!isAllowed) {
      return res.status(403).json({ error: 'You are not authorized to view versions for this document.' });
    }
    const versions = await DocumentsService.getDocumentVersions(document_id);
    res.status(200).json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document versions.', details: err });
  }
});

// GET /api/documents/:document_id/versions/:version_id/download - Download compiled PDF for a document version
documentsRouter.get('/:document_id/versions/:version_id/download', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const version_id = Number(req.params.version_id);
  const user_id = req.session.user_id;
  const role = req.session.role;
  if (!user_id || !role) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  try {
    // Allow access if user is admin or is an editor/owner/mentor/viewer on the document
    const isAllowed =
      role === 'admin' ||
      await DocumentsService.isEditor(document_id, user_id, ['owner', 'editor', 'mentor', 'viewer']);
    if (!isAllowed) {
      return res.status(403).json({ error: 'You are not authorized to download this document version.' });
    }
    // Fetch the version info
    const version = await DocumentsService.getDocumentVersionById(document_id, version_id);
    if (!version || !version.compiled_pdf_path) {
      return res.status(404).json({ error: `PDF for version you requested - ${version_id} - not found in the database.` });
    }
    // Extract filename from path and set Content-Disposition header for proper download name
    const filename = path.basename(version.compiled_pdf_path);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    // Send the PDF file
    return res.sendFile(version.compiled_pdf_path, { root: process.cwd() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to download PDF from backend.', details: err });
  }
});

// PUT /api/documents/:document_id/status - Change document status (admin or mentor only)
documentsRouter.put('/:document_id/status', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const user_id = req.session.user_id;
  const role = req.session.role;
  const { status } = req.body; // expected: 'draft', 'submitted', 'under_review', 'finished', 'graded'

  if (!user_id || !role) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  // Only admin or mentor of this document can change status
  const isMentor = await DocumentsService.isEditor(document_id, user_id, ['mentor']);
  if (role !== 'admin' && !isMentor) {
    return res.status(403).json({ error: `Only admin or mentor can change document status! Your user role is ${role}.` });
  }

  try {
    // Update status in documents table
    const updated = await DocumentsService.updateDocumentStatus(document_id, status);
    if (!updated) {
      return res.status(400).json({ error: 'Invalid status or document not found in database!' });
    }
    // Log to workflow history
    await DocumentWorkflowService.addWorkflowEvent(document_id, status, user_id);
    // Log to audit log
    await AuditService.createAuditLog({
      user_id,
      action_type: 'edit',
      entity_type: 'document',
      entity_id: document_id
    });
    res.status(200).json({ success: true, newStatus: status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change document status.', details: err });
  }
});


// PUT /api/documents/:document_id/grade - Only mentors of the document can change the grade
documentsRouter.put('/:document_id/grade', checkMentor, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const user_id = req.session.user_id;
  const role = req.session.role;
  const { grade } = req.body; // expected: number (1-100)

  if (!user_id || !role) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  // Only mentor of this document can change grade (no admin access)
  const isMentor = await DocumentsService.isEditor(document_id, user_id, ['mentor']);
  if (!isMentor) {
    return res.status(403).json({ error: 'Only mentor of this document can change the grade.' });
  }

  try {
    const updated = await DocumentsService.updateDocumentGrade(document_id, grade);
    if (!updated) {
      return res.status(400).json({ error: 'Invalid grade or document not found.' });
    }
    // Log to audit log
    await AuditService.createAuditLog({
      user_id,
      action_type: 'grade',
      entity_type: 'document',
      entity_id: document_id
    });
    res.status(200).json({ success: true, newGrade: grade });
  } catch (err) {
    res.status(500).json({ error: `Failed to change document grade for user: ${user_id} with role: ${role}.`, details: err });
  }
});

export default documentsRouter;
