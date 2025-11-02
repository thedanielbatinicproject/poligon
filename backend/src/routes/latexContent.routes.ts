import { Router, Request, Response } from 'express';
import { validateAndGetLatex } from '../render/onlineRenderer';

const router = Router();

// Public route used by external renderer to fetch LaTeX source
router.get('/:token', async (req: Request, res: Response) => {
  const token = req.params.token;
  if (!token) return res.status(404).send('Not found');
  try {
    const latex = await validateAndGetLatex(token);
    if (latex === null) return res.status(404).send('Not found or expired');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(latex);
  } catch (err) {
    return res.status(500).send('Server error');
  }
});

export default router;
