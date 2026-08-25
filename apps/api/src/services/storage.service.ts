import { put } from '@vercel/blob';

export class StorageService {
  /**
   * Uploads a file buffer to Vercel Blob storage.
   * @param fileName The original file name
   * @param fileBuffer The file content as a buffer
   * @param mimeType The file MIME type (e.g., application/pdf)
   * @returns The uploaded blob details including the URL
   */
  static async uploadFile(fileName: string, fileBuffer: Buffer, mimeType: string) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not configured in the environment variables.');
    }

    try {
      const blob = await put(fileName, fileBuffer, {
        access: 'public', // Set to public for standard read access. Note: for sensitive docs, we might want 'private' or signed URLs in the future.
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: mimeType,
      });

      return blob;
    } catch (error) {
      console.error('Error uploading file to Vercel Blob:', error);
      throw new Error('Failed to upload file to storage.');
    }
  }
}
