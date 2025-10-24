import { Router, Request, Response } from 'express';
import { DocumentsService } from '../services/documents.service';
import { checkLogin, checkAdmin, checkMentor, checkStudent } from '../middleware/auth.middleware';

const documentsRouter = Router();

// POST /api/documents - Create new document (admin/mentor only)
documentsRouter.post('/', checkLogin, async (req: Request, res: Response) => {
  const role = req.session.role;
  const user_id = req.session.user_id;
  if (role !== 'admin' && role !== 'mentor') {
    return res.status(403).json({ error: 'Only admin or mentor can create documents!' });
  }
  try {
    const doc = await DocumentsService.createDocument({
      ...req.body,
      created_by: user_id
    });
    if (!doc) {
      return res.status(400).json({ error: 'Invalid document data or validation failed!' });
    }
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create document!', details: err });
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document even though user is authorized.', details: err });
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
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit document.', details: err });
  }
});

// GET /api/documents/:document_id/content - Get latex_content for a document
// Access rights: editor only, owner or mentor
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





export default documentsRouter;
