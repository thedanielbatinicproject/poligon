import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed mimetypes for images and documents
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DOC_MIME_TYPES = ['application/pdf', 'application/x-bibtex', 'application/x-tex', 'text/x-tex', 'text/plain'];

// Multer storage config (disk storage, unique filename)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save images and docs in different folders
    if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, path.join(__dirname, '../../uploads/images'));
    } else {
      cb(null, path.join(__dirname, '../../uploads/documents'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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
    if (DOC_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only document files (pdf, bib, tex) are allowed!'));
    }
  }
});
