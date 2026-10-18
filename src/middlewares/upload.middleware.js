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

const baseUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per image
  fileFilter: imageFilter,
});

/**
 * Single file upload middleware (accepts field: 'image' or 'file')
 */
const singleUploadHandler = baseUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

export const uploadSingleImage = (req, res, next) => {
  singleUploadHandler(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = req.files.image?.[0] || req.files.file?.[0] || null;
    }
    next();
  });
};

/**
 * Multiple files upload middleware (accepts fields: 'images' or 'files', max 10 images)
 */
const multipleUploadHandler = baseUpload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'files', maxCount: 10 },
]);

export const uploadMultipleImages = (req, res, next) => {
  multipleUploadHandler(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.files = req.files.images || req.files.files || [];
    } else {
      req.files = [];
    }
    next();
  });
};

/**
 * Banner image upload middleware (accepts fields: 'backgroundImage', 'image', or 'banner')
 */
const bannerUploadHandler = baseUpload.fields([
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

export const uploadBannerImage = (req, res, next) => {
  bannerUploadHandler(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file =
        req.files.backgroundImage?.[0] ||
        req.files.banner?.[0] ||
        req.files.image?.[0] ||
        null;
    }
    next();
  });
};

/**
 * Avatar image upload middleware (accepts fields: 'avatar' or 'image')
 */
const avatarUploadHandler = baseUpload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

export const uploadAvatarImage = (req, res, next) => {
  avatarUploadHandler(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = req.files.avatar?.[0] || req.files.image?.[0] || null;
    }
    next();
  });
};
