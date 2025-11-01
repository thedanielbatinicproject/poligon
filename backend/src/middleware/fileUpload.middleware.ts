import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed mimetypes for images and documents
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DOC_MIME_TYPES = ['application/pdf', 'application/x-bibtex', 'application/x-tex', 'text/x-tex', 'text/plain', 'application/octet-stream'];

// Multer storage config: store incoming uploads temporarily in uploads/tmp
// We'll move files into per-document folders in the route handler to ensure
// we have the document_id from the form fields and to avoid renaming the file.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const base = path.join(__dirname, '../../uploads/tmp');
    try {
      // ensure directory exists
      require('fs').mkdirSync(base, { recursive: true });
    } catch (e) {
      // ignore
    }
    cb(null, base);
  },
  filename: (req, file, cb) => {
    // Keep original filename where possible, but sanitize basename to avoid path tricks.
    const original = path.basename(file.originalname || 'upload');
    // If a file with the same name exists in tmp, append a short uniq suffix to avoid collisions in tmp.
    const fs = require('fs');
    const target = path.join(path.join(__dirname, '../../uploads/tmp'), original);
    if (!fs.existsSync(target)) {
      cb(null, original);
      return;
    }
    const uniq = `${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
    const ext = path.extname(original);
    const baseName = original.slice(0, original.length - ext.length);
    cb(null, `${baseName}-${uniq}${ext}`);
  }
});

// File filter for images
export const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// File filter for documents
export const documentUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
  // Extend allowed extensions to include common image formats that LaTeX can import
  // (jpg/jpeg, png, tiff/tif, gif, eps, svg) in addition to document types
  const allowedExt = ['.pdf', '.bib', '.tex', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.gif', '.eps', '.svg'];
    // Accept if mimetype is known allowed or file extension matches allowed extensions
    if (DOC_MIME_TYPES.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only document files (pdf, bib, tex) are allowed!'));
    }
  }
});
