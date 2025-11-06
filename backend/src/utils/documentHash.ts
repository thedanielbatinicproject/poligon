import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const SESSION_SECRET = process.env.SESSION_SECRET || 'default_secret';

/**
 * Generates a unique 15-character hash from a document_id using SESSION_SECRET.
 * Hash is persistent - same document_id always produces same hash.
 * Uses SHA256 for cryptographic strength.
 * 
 * @param document_id - Document ID to encode
 * @returns 15-character hash string (lowercase letters and digits)
 */
export function encodeDocumentId(document_id: number): string {
  const data = `${SESSION_SECRET}:${document_id}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  // Take first 15 characters for shorter URLs
  return hash.substring(0, 15);
}

/**
 * Decodes a hash back to document_id by brute-force verification.
 * Checks document IDs from 1 to maxSearchRange until hash matches.
 * 
 * WARNING: This is O(n) complexity - for production with many documents,
 * consider storing hash mappings in database or using reversible encryption (AES).
 * 
 * @param hashCode - 15-character hash to decode
 * @param maxSearchRange - Maximum document_id to search (default: 100000)
 * @returns document_id if found, null otherwise
 */
export function decodeDocumentHash(hashCode: string, maxSearchRange: number = 100000): number | null {
  // Validate hash format
  if (!hashCode || hashCode.length !== 15 || !/^[a-f0-9]{15}$/.test(hashCode)) {
    return null;
  }
  
  // Brute-force search through possible document IDs
  for (let id = 1; id <= maxSearchRange; id++) {
    if (encodeDocumentId(id) === hashCode) {
      return id;
    }
  }
  
  return null;
}
