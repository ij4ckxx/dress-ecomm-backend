import cloudinary from '../config/cloudinary.js';

let clockOffsetMs = 0;
let lastOffsetSync = 0;

const getSyncedTimestamp = async () => {
  const now = Date.now();
  if (now - lastOffsetSync > 10 * 60 * 1000) {
    try {
      const res = await fetch('https://api.cloudinary.com', { method: 'HEAD' });
      const serverDateHeader = res.headers.get('date');
      if (serverDateHeader) {
        clockOffsetMs = new Date(serverDateHeader).getTime() - now;
        lastOffsetSync = now;
      }
    } catch {
      // Fallback silently if offline
    }
  }
  return Math.floor((Date.now() + clockOffsetMs) / 1000);
};

/**
 * Uploads an image Buffer directly to Cloudinary (zero local disk storage).
 *
 * @param {Buffer} fileBuffer - The in-memory buffer of the file
 * @param {string} folder - Folder name in Cloudinary (e.g., 'dresses/products')
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadImageToCloudinary = async (fileBuffer, folder = 'dresses') => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env'
    );
  }

  const timestamp = await getSyncedTimestamp();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        timestamp,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Deletes an image from Cloudinary by its public ID.
 *
 * @param {string} publicId
 * @returns {Promise<any>}
 */
export const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return;
  return cloudinary.uploader.destroy(publicId);
};
