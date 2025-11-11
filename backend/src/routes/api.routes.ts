import path from 'path';
import fs from 'fs';
import { DocumentsService } from '../services/documents.service';
import { Router, Request, Response } from 'express';
import { checkLogin } from '../middleware/auth.middleware';
import { getUserById } from '../services/user.service';
import filesRouter from './files.routes';
import usersRouter from './users.routes';
import authRouter from './auth.routes';
import utilityRouter from './utility.routes';
import documentsRouter from './documents.routes';

const apiRouter = Router();

apiRouter.use('/files', filesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/documents', documentsRouter);

apiRouter.use('/utility', utilityRouter);
apiRouter.use('/auth', authRouter);

// Serve temp PDF for a document (with access control)
apiRouter.get('/uploads/:document_id/temp/:filename', checkLogin, async (req, res) => {
  const document_id = Number(req.params.document_id);
  const filename = req.params.filename;
  const user_id = req.session.user_id;
  const role = req.session.role;
  if (!user_id || !role) return res.status(401).json({ error: 'User not authenticated.' });
  // Only editors, owners, mentors, or admins can view
  const isAllowed = role === 'admin' || await DocumentsService.isEditor(document_id, user_id, ['owner', 'editor', 'mentor']);
  if (!isAllowed) return res.status(403).json({ error: 'Not authorized to view temp PDF for this document.' });
  const filePath = path.join(process.cwd(), 'uploads', String(document_id), 'temp', filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  return res.sendFile(filePath);
});

// API HEALTH TODO: advance this to a proper health check endpoint
apiRouter.get('/status', checkLogin, async (req: Request, res: Response) => {
  try {
    const session = req.session;
    let user = null;
    if (session && session.user_id) {
      user = await getUserById(session.user_id);
    }
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      session: {
        ...session,
        cookie: undefined // hide cookie object for brevity/security
      },
      user: user || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get advanced health info', details: err });
  }
});

export default apiRouter;