import multer from 'multer';

// Enforce in-memory storage only — NEVER writes to laptop, mobile, or server disk
const memoryStorage = multer.memoryStorage();

// File filter for image types only
const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'), false);
  }
};

/**
 * Single file upload middleware (held in memory)
 */
export const uploadSingleImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: imageFilter,
}).single('image');

/**
 * Multiple files upload middleware (held in memory, max 5 images per request)
 */
export const uploadMultipleImages = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).array('images', 5);
