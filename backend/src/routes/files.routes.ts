import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Dodaj validaciju!

// Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
  // TODO: Validacija, upis u bazu, provjera korisnika
  res.json({ message: 'File uploaded (not yet implemented fully in backend/routes/files.routes.ts)' });
});

// Download file
router.get('/:id', async (req, res) => {
  // TODO: Provjeri prava, pronađi file u bazi, pošalji file
  res.status(501).json({ error: 'Download not yet implemented in backend/routes/files.routes.ts' });
});

export default router;