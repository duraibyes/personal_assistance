import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

function ensureConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export type StorageEntityType =
  | 'loans'
  | 'expenses'
  | 'incomes'
  | 'purchases'
  | 'vehicles'
  | 'documents';

export class StorageService {
  /**
   * Uploads a file buffer to Cloudinary under:
   * {CLOUDINARY_UPLOAD_FOLDER}/{entityType}/{entityId}/{fileName}
   */
  static async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    options: {
      entityType: StorageEntityType;
      entityId: string;
    }
  ): Promise<{ url: string; publicId: string; storageKey: string }> {
    ensureConfigured();

    const baseFolder =
      process.env.CLOUDINARY_UPLOAD_FOLDER?.replace(/\/+$/, '') || 'personal_assistant';
    const folder = `${baseFolder}/${options.entityType}/${options.entityId}`;
    const publicId = fileName.replace(/\.[^/.]+$/, '').replace(/[^\w.-]+/g, '_');

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
          overwrite: true,
          type: 'upload',
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            console.error('Error uploading file to Cloudinary:', error);
            reject(new Error('Failed to upload file to storage.'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            storageKey: result.public_id,
          });
        }
      );

      stream.end(fileBuffer);
    });
  }

  /**
   * Deletes a file previously returned by uploadFile, given its secure URL
   * (https://res.cloudinary.com/{cloud}/{resourceType}/upload/v123/{publicId}.{ext}).
   * Best effort: resolves false when the URL is not a Cloudinary upload URL.
   */
  static async deleteByUrl(url: string): Promise<boolean> {
    const match = url.match(/\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return false;
    ensureConfigured();
    const resourceType = match[1] as 'image' | 'video' | 'raw';
    // Raw files keep their extension in the public id; images and videos do not.
    const publicId = decodeURIComponent(resourceType === 'raw' ? match[2] : match[2].replace(/\.[^/.]+$/, ''));
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    return result?.result === 'ok';
  }
}
