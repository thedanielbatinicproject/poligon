import { Router, Request, Response } from 'express';
import { checkLogin, checkAdmin } from '../middleware/auth.middleware';
import { imageUpload, documentUpload } from '../middleware/fileUpload.middleware';
import filesService from '../services/files.service';
import { deleteFileFromDisk } from '../services/fileDisk.service';
import path from 'path';

const filesRouter = Router();

// POST /files/upload/image
filesRouter.post('/upload/image', checkLogin, imageUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File missing from a request!' });
    const { document_id } = req.body;
    const uploaded_by = req.session.user_id;
    if (typeof uploaded_by !== 'number') {
      return res.status(401).json({ error: 'File does not have \'uploaded_by\' property or it has it incorrectly defined! Session is probably ill-defined.' });
    }
    const file_type = 'image';
    const file_path = req.file.path;
    const file_size = req.file.size;
    const fileUpload = await filesService.insertFileUpload({
      document_id: Number(document_id),
      uploaded_by,
      file_path,
      file_type,
      file_size,
    });
    res.status(201).json(fileUpload);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed even though user is authorized!', details: err });
  }
});

// POST /files/upload/document
filesRouter.post('/upload/document', checkLogin, documentUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { document_id } = req.body;
    const uploaded_by = req.session.user_id;
    if (typeof uploaded_by !== 'number') {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // file_type: pdf, bib, tex (determine from mimetype/ext)
    let file_type: 'pdf' | 'bib' | 'tex' = 'pdf';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.bib') file_type = 'bib';
    else if (ext === '.tex') file_type = 'tex';
    else file_type = 'pdf';
    const file_path = req.file.path;
    const file_size = req.file.size;
    const fileUpload = await filesService.insertFileUpload({
      document_id: Number(document_id),
      uploaded_by,
      file_path,
      file_type,
      file_size,
    });
    res.status(201).json(fileUpload);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err });
  }
});

// GET /files/:file_id - get file metadata
filesRouter.get('/:file_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const file_id = Number(req.params.file_id);
    const file = await filesService.getFileById(file_id);
    if (!file) return res.status(404).json({ error: 'File with id ' + (file_id||"{wrong file id format}") + ' not found!' });
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get file', details: err });
  }
});

// DELETE /files/:file_id - delete file
filesRouter.delete('/:file_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const file_id = Number(req.params.file_id);
    const file = await filesService.getFileById(file_id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const user_id = req.session.user_id;
    const user_role = req.session.role;
    if (user_role !== 'admin' && file.uploaded_by !== user_id) {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }
    await deleteFileFromDisk(file.file_path);
    await filesService.deleteFileUpload(file_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file!', details: err });
  }
});

// GET /files/download/:file_id - download file
filesRouter.get('/download/:file_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const file_id = Number(req.params.file_id);
    const file = await filesService.getFileById(file_id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const user_id = req.session.user_id;
    const user_role = req.session.role;
    if (user_role !== 'admin' && file.uploaded_by !== user_id) {
      return res.status(403).json({ error: 'Not authorized to download this file!' });
    }
    res.download(file.file_path);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download even though user is authorized!', details: err });
  }
});

export default filesRouter;