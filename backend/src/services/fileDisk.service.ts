import fs from 'fs/promises';

/**
 * Deletes a file from the disk.
 * @param filePath Absolute or relative path to the file
 * @returns Promise<void>
 */
export async function deleteFileFromDisk(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    // Ignore error if file does not exist
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}
