import { Router } from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  syncCollectionProducts,
  addProductsToCollection,
  removeProductFromCollection,
  deleteCollection,
} from '../../controllers/admin/collection.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { uploadSingleImage } from '../../middlewares/upload.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  createAdminCollectionSchema,
  updateAdminCollectionSchema,
  syncCollectionProductsSchema,
  queryAdminCollectionSchema,
  collectionParamIdSchema,
} from '../../validators/admin/collection.validator.js';

const router = Router();

// Global Admin authentication guard for all collection routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/collections
 * @desc    Get paginated collections
 * @access  Private (Admin)
 */
router.get('/', adminLimiter, validateQuery(queryAdminCollectionSchema), getCollections);

/**
 * @route   GET /api/v1/admin/collections/:id
 * @desc    Get single collection details with ordered products list
 * @access  Private (Admin)
 */
router.get('/:id', adminLimiter, validateParams(collectionParamIdSchema), getCollectionById);

/**
 * @route   POST /api/v1/admin/collections
 * @desc    Create a curated collection (accepts JSON or multipart/form-data image)
 * @access  Private (Admin with collections:manage)
 */
router.post(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.COLLECTIONS_MANAGE),
  uploadSingleImage,
  validate(createAdminCollectionSchema),
  createCollection
);

/**
 * @route   PUT /api/v1/admin/collections/:id
 * @desc    Update collection details
 * @access  Private (Admin with collections:manage)
 */
router.put(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.COLLECTIONS_MANAGE),
  validateParams(collectionParamIdSchema),
  uploadSingleImage,
  validate(updateAdminCollectionSchema),
  updateCollection
);

/**
 * @route   PUT /api/v1/admin/collections/:id/products
 * @desc    Replace and reorder all products in a collection
 * @access  Private (Admin with collections:manage)
 */
router.put(
  '/:id/products',
  adminLimiter,
  requirePermission(PERMISSIONS.COLLECTIONS_MANAGE),
  validateParams(collectionParamIdSchema),
  validate(syncCollectionProductsSchema),
  syncCollectionProducts
);

/**
 * @route   POST /api/v1/admin/collections/:id/products
 * @desc    Append products to a collection
 * @access  Private (Admin with collections:manage)
 */
router.post(
  '/:id/products',
  adminLimiter,
  requirePermission(PERMISSIONS.COLLECTIONS_MANAGE),
  validateParams(collectionParamIdSchema),
  validate(syncCollectionProductsSchema),
  addProductsToCollection
);

/**
 * @route   DELETE /api/v1/admin/collections/:id/products/:productId
 * @desc    Remove a product from a collection
 * @access  Private (Admin with collections:manage)
 */
router.delete(
  '/:id/products/:productId',
  adminLimiter,
  requirePermission(PERMISSIONS.COLLECTIONS_MANAGE),
  removeProductFromCollection
);

/**
 * @route   DELETE /api/v1/admin/collections/:id
 * @desc    Delete a curated collection
 * @access  Private (Admin with collections:manage)
 */
router.delete(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.COLLECTIONS_MANAGE),
  validateParams(collectionParamIdSchema),
  deleteCollection
);

export default router;
