import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
} from '../../controllers/admin/product.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { uploadMultipleImages } from '../../middlewares/upload.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  createAdminProductSchema,
  updateAdminProductSchema,
  toggleProductStatusSchema,
  queryAdminProductSchema,
  productParamIdSchema,
  productImageParamSchema,
} from '../../validators/admin/product.validator.js';

const router = Router();

// Global Admin authentication guard for all product routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/products
 * @desc    Get paginated products with faceted filters
 * @access  Private (Admin with products:read)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validateQuery(queryAdminProductSchema),
  getProducts
);

/**
 * @route   GET /api/v1/admin/products/:id
 * @desc    Get complete product detail with variants and images
 * @access  Private (Admin with products:read)
 */
router.get(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validateParams(productParamIdSchema),
  getProductById
);

/**
 * @route   POST /api/v1/admin/products
 * @desc    Create a product with variants and optional images
 * @access  Private (Admin with products:write)
 */
router.post(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_WRITE),
  uploadMultipleImages,
  validate(createAdminProductSchema),
  createProduct
);

/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update an existing product and its variants
 * @access  Private (Admin with products:write)
 */
router.put(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_WRITE),
  validateParams(productParamIdSchema),
  uploadMultipleImages,
  validate(updateAdminProductSchema),
  updateProduct
);

/**
 * @route   PATCH /api/v1/admin/products/:id/status
 * @desc    Quick toggle active or featured status
 * @access  Private (Admin with products:write)
 */
router.patch(
  '/:id/status',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_WRITE),
  validateParams(productParamIdSchema),
  validate(toggleProductStatusSchema),
  toggleProductStatus
);

/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete or soft-archive product
 * @access  Private (Admin with products:delete)
 */
router.delete(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  validateParams(productParamIdSchema),
  deleteProduct
);

/**
 * @route   POST /api/v1/admin/products/:id/images
 * @desc    Upload additional images to product gallery
 * @access  Private (Admin with products:write)
 */
router.post(
  '/:id/images',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_WRITE),
  validateParams(productParamIdSchema),
  uploadMultipleImages,
  uploadProductImages
);

/**
 * @route   DELETE /api/v1/admin/products/:id/images/:imageId
 * @desc    Delete image from product
 * @access  Private (Admin with products:delete)
 */
router.delete(
  '/:id/images/:imageId',
  adminLimiter,
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  validateParams(productImageParamSchema),
  deleteProductImage
);

export default router;
