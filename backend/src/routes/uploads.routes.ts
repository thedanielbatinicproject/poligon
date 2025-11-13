import path from 'path';
import fs from 'fs';
import { DocumentsService } from '../services/documents.service';
import { Router, Request, Response } from 'express';
import { checkLogin } from '../middleware/auth.middleware';

const uploadsRouter = Router();

// Serve images from uploads/:document_id/:filename with access control
uploadsRouter.get('/:document_id/:filename', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  const filename = req.params.filename;
  const user_id = req.session.user_id;
  const role = req.session.role;
  if (!user_id || !role) return res.status(401).json({ error: 'User not authenticated.' });
  // Only editors, owners, mentors, or admins can view
  const isAllowed = role === 'admin' || await DocumentsService.isEditor(document_id, user_id, ['owner', 'editor', 'mentor']);
  if (!isAllowed) return res.status(403).json({ error: 'Not authorized to view images for this document.' });
  const filePath = path.join(process.cwd(), 'uploads', String(document_id), filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });
  // Set content type based on extension
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' :
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
    ext === '.gif' ? 'image/gif' :
    ext === '.webp' ? 'image/webp' :
    ext === '.bmp' ? 'image/bmp' :
    ext === '.tiff' ? 'image/tiff' :
    'application/octet-stream';
  res.setHeader('Content-Type', mime);
  return res.sendFile(filePath);
});

export default uploadsRouter;
