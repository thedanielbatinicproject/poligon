/**
 * Service for managing file uploads and metadata in the file_uploads table.
 * Provides functions for inserting, deleting, and retrieving file records.
 * All operations are type-safe and intended for use in enterprise-grade backend flows.
 */
import { Pool } from 'mysql2/promise';
import db from '../db';

export type FileType = 'image' | 'pdf' | 'bib' | 'tex';

export interface FileUpload {
  file_id: number;
  document_id: number;
  uploaded_by: number;
  file_path: string;
  file_type: FileType;
  file_size: number;
  uploaded_at: Date;
}

// Insert new file upload record
export  async function insertFileUpload({
  document_id,
  uploaded_by,
  file_path,
  file_type,
  file_size,
}: Omit<FileUpload, 'file_id' | 'uploaded_at'>): Promise<FileUpload> {
  const [result] = await db.execute(
    `INSERT INTO file_uploads (document_id, uploaded_by, file_path, file_type, file_size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [document_id, uploaded_by, file_path, file_type, file_size]
  );
  const file_id = (result as any).insertId;
  const [rows] = await db.execute('SELECT * FROM file_uploads WHERE file_id = ?', [file_id]);
  return (rows as FileUpload[])[0];
}

// Delete file upload record by file_id
export async function deleteFileUpload(file_id: number): Promise<void> {
  await db.execute('DELETE FROM file_uploads WHERE file_id = ?', [file_id]);
}

// Get all files for a document
export async function getFilesByDocument(document_id: number): Promise<FileUpload[]> {
  const [rows] = await db.execute('SELECT * FROM file_uploads WHERE document_id = ?', [document_id]);
  return rows as FileUpload[];
}

// Get single file by id
export async function getFileById(file_id: number): Promise<FileUpload | null> {
  const [rows] = await db.execute('SELECT * FROM file_uploads WHERE file_id = ?', [file_id]);
  return (rows as FileUpload[])[0] || null;
}

export default {
  insertFileUpload,
  deleteFileUpload,
  getFilesByDocument,
  getFileById,
};
