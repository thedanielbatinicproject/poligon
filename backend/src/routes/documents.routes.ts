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
// Only mentor može mijenjati title, status, language, grade
// Mentor ili editor/owner može mijenjati abstract, latex_content
// type_id, compiled_pdf_path, created_by, created_at, updated_at se ne mijenjaju
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

export default documentsRouter;
