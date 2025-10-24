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

documentsRouter.get('/all', checkLogin, async (req: Request, res: Response) => {
    
});



export default documentsRouter;
