import { Router } from 'express';
const apiRouter = Router();

// import usersRouter from './users.routes';
// import utilityRouter from './utility.routes';

// apiRouter.use('/users', usersRouter);
// apiRouter.use('/utility', utilityRouter);


// API HEALTH TODO: advance this to a proper health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Poligon backend is running.' });
});
export default apiRouter;