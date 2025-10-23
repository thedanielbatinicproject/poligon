import { Router } from 'express';
const authRouter = Router();

// Example: health check for auth TODO: advance this to check real auth service status
authRouter.get('/status', (_req, res) => {
  res.json({ status: 'ok', message: 'Auth route is working.' });
});

export default authRouter;