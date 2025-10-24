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