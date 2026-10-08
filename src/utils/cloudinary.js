import cloudinary from '../config/cloudinary.js';

/**
 * Uploads an image Buffer directly to Cloudinary (zero local disk storage).
 *
 * @param {Buffer} fileBuffer - The in-memory buffer of the file
 * @param {string} folder - Folder name in Cloudinary (e.g., 'dresses/products')
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadImageToCloudinary = (fileBuffer, folder = 'dresses') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env'
        )
      );
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }, // Free auto-compression & WebP delivery
        ],
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
