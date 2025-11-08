import { Request, Response, NextFunction, Router} from 'express';
import { checkLogin, checkAdmin } from '../middleware/auth.middleware';
import { imageUpload, documentUpload } from '../middleware/fileUpload.middleware';
import filesService from '../services/files.service';
import { DocumentsService } from '../services/documents.service';
import { deleteFileFromDisk } from '../services/fileDisk.service';
import path from 'path';
import fs from 'fs/promises';
import { AuditService } from '../services/audit.service';

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
    if (!document_id) return res.status(400).json({ error: 'document_id missing' });
    const docId = Number(document_id);
    if (isNaN(docId)) return res.status(400).json({ error: 'Invalid document_id' });

    // move file from tmp to per-document folder without renaming
    const uploadsBase = path.join(__dirname, '../../uploads');
    const targetDir = path.join(uploadsBase, String(docId));
    try { await fs.mkdir(targetDir, { recursive: true }); } catch (e) {}

    const originalName = path.basename(req.file.originalname || req.file.filename || 'upload');
    const destPath = path.join(targetDir, originalName);
    // if target exists, do not overwrite
    try {
      await fs.access(destPath);
      return res.status(409).json({ error: 'File with same name already exists for this document' });
    } catch (e) {
      // does not exist, continue
    }
    // move
    await fs.rename(req.file.path, destPath);

    const file_type = 'image';
    const file_path_db = `/uploads/${docId}`; // store only folder path in DB
    const file_size = req.file.size;
    const file_name = originalName;
    const fileUpload = await filesService.insertFileUpload({
      document_id: docId,
      uploaded_by,
      file_path: file_path_db,
      file_name,
      file_type,
      file_size,
    });

    await AuditService.createAuditLog({
      user_id: Number(req.session.user_id),
      action_type: 'upload',
      entity_type: 'file',
      entity_id: fileUpload.file_id
    });

    res.status(201).json(fileUpload);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed even though user is authorized!', details: err });
  }
});

// POST /files/upload/document
filesRouter.post('/upload/document', checkLogin, documentUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File missing from request' });
    const { document_id } = req.body;
    const uploaded_by = req.session.user_id;
    if (typeof uploaded_by !== 'number') {
      return res.status(401).json({ error: 'User not authenticated!' });
    }
    if (!document_id) return res.status(400).json({ error: 'document_id missing' });
    const docId = Number(document_id);
    if (isNaN(docId)) return res.status(400).json({ error: 'Invalid document_id' });

    // determine file type by extension
    let file_type: 'pdf' | 'bib' | 'tex' = 'pdf';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.bib') file_type = 'bib';
    else if (ext === '.tex') file_type = 'tex';
    else file_type = 'pdf';

    // move file from tmp to per-document folder without renaming
    const uploadsBase = path.join(__dirname, '../../uploads');
    const targetDir = path.join(uploadsBase, String(docId));
    try { await fs.mkdir(targetDir, { recursive: true }); } catch (e) {}

    const originalName = path.basename(req.file.originalname || req.file.filename || 'upload');
    const destPath = path.join(targetDir, originalName);
    // if target exists, do not overwrite
    try {
      await fs.access(destPath);
      return res.status(409).json({ error: 'File with same name already exists for this document' });
    } catch (e) {
      // not exists
    }
    await fs.rename(req.file.path, destPath);

    const file_path_db = `/uploads/${docId}`; // store only folder path
    const file_size = req.file.size;
    const file_name = originalName;
    const fileUpload = await filesService.insertFileUpload({
      document_id: docId,
      uploaded_by,
      file_path: file_path_db,
      file_name,
      file_type,
      file_size,
    });
    await AuditService.createAuditLog({
      user_id: Number(req.session.user_id),
      action_type: 'upload',
      entity_type: 'file',
      entity_id: fileUpload.file_id // ID novouploanog file-a iz baze
    });
    res.status(201).json(fileUpload);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed even though user is authorized!', details: err });
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

// GET /files/document/:document_id - list files attached to a document
filesRouter.get('/document/:document_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const document_id = Number(req.params.document_id);
    if (isNaN(document_id)) return res.status(400).json({ error: 'Invalid document_id' });
    const user_id = req.session.user_id;
    const role = req.session.role;
    if (!user_id || !role) return res.status(401).json({ error: 'Not authenticated' });
    // Allow if admin or editor/owner/mentor on document
    const isAllowed = role === 'admin' || await DocumentsService.isEditor(document_id, user_id, ['owner','editor','mentor']);
    if (!isAllowed) return res.status(403).json({ error: 'Not authorized to view files for this document' });
    const files = await filesService.getFilesByDocument(document_id);
    res.status(200).json(files || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list files for document', details: err });
  }
});

// DELETE /files/:file_id - delete file
filesRouter.delete('/:file_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const file_id = Number(req.params.file_id);
    const file = await filesService.getFileById(file_id);
    if (!file) return res.status(404).json({ error: 'File with id ' + (file_id||"{wrong file id format}") + ' not found!' });
    const user_id = req.session.user_id;
    const user_role = req.session.role;
    
    if (!user_id) {
      return res.status(401).json({ error: 'User ID not found in session' });
    }
    
    // Check permissions: admin, uploader, or mentor on the document
    let canDelete = false;
    if (user_role === 'admin') {
      canDelete = true;
    } else if (file.uploaded_by === user_id) {
      canDelete = true;
    } else if (file.document_id) {
      // Check if user is mentor on the document
      const isMentor = await DocumentsService.isEditor(file.document_id, user_id, ['mentor']);
      if (isMentor) {
        canDelete = true;
      }
    }
    
    if (!canDelete) {
      // Return detailed debug info in error
      return res.status(403).json({ 
        error: 'Not authorized to delete this file' +
          file.uploaded_by + ' ' +
          user_id + ' ' +
          user_role
        
      });
    }
    // construct full disk path from stored folder path + filename
    const folder = (file.file_path || '').replace(/^\/+/, '');
    const fullPath = path.join(__dirname, '../../', folder, file.file_name);
    // If the file does not exist on disk, remove DB record to avoid stale entry
    try {
      await fs.access(fullPath);
      // file exists -> remove from disk
      await deleteFileFromDisk(fullPath);
      await filesService.deleteFileUpload(file_id);
      await AuditService.createAuditLog({
        user_id: Number(req.session.user_id),
        action_type: 'delete',
        entity_type: 'file',
        entity_id: file_id
      });
      return res.json({ success: true });
    } catch (e: any) {
      // If missing (ENOENT) remove DB record and return 404 with message
      if ((e as any).code === 'ENOENT') {
        try {
          await filesService.deleteFileUpload(file_id);
          await AuditService.createAuditLog({
            user_id: Number(req.session.user_id),
            action_type: 'delete',
            entity_type: 'file',
            entity_id: file_id
          });
        } catch (innerErr) {
          console.error('[files.routes] failed to delete stale DB record for missing file', innerErr);
        }
        return res.status(404).json({ error: 'File not on server disk; database record removed' });
      }
      // other errors
      return res.status(500).json({ error: 'Failed to delete file with id ' + req.params.file_id + '!', details: e });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file with id ' + req.params.file_id + '!', details: err });
  }
});

// GET /files/download/:file_id - download file
filesRouter.get('/download/:file_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const file_id = Number(req.params.file_id);
    const file = await filesService.getFileById(file_id);
    if (!file) return res.status(404).json({ error: 'File not found on server disk!' });
    const user_id = req.session.user_id;
    const user_role = req.session.role;
    if (user_role !== 'admin' && file.uploaded_by !== user_id) {
      return res.status(403).json({ error: 'Not authorized to download this file!' });
    }
    const folder = (file.file_path || '').replace(/^\/+/, '');
    const fullPath = path.join(__dirname, '../../', folder, file.file_name);
    // Check existence first and return JSON 404 if missing
    try {
      await fs.access(fullPath);
    } catch (e: any) {
      return res.status(404).json({ error: 'File not found on server disk!' });
    }

    // Use callback to catch streaming errors and respond with JSON
    res.download(fullPath, file.file_name, (err) => {
      if (err) {
        // if headers already sent, just log
        if (res.headersSent) {
          console.error('[files.routes] download stream error after headers sent', err);
          return;
        }
        if ((err as any).code === 'ENOENT') {
          return res.status(404).json({ error: 'File not found on server disk!' });
        }
        return res.status(500).json({ error: 'Failed to download file', details: String(err) });
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to download even though user is authorized!', details: err });
  }
});

// Error handling middleware for file uploads
filesRouter.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large, limit is ' + process.env.MAX_FILE_SIZE_MB + 'mb!' });
  }
  if (err && err.message && (
    err.message.includes('Only image files are allowed') ||
    err.message.includes('Only document files')
  )) {
    return res.status(415).json({ error: 'Unsupported file type!' });
  }
  next(err);
});

export default filesRouter;