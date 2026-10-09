import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../controllers/admin/category.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { uploadSingleImage } from '../../middlewares/upload.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  createAdminCategorySchema,
  updateAdminCategorySchema,
  queryAdminCategorySchema,
  categoryParamIdSchema,
} from '../../validators/admin/category.validator.js';

const router = Router();

// Global Admin authentication guard for all category routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/categories
 * @desc    Get categories in tree, flat, or root-only view
 * @access  Private (Admin)
 */
router.get('/', adminLimiter, validateQuery(queryAdminCategorySchema), getCategories);

/**
 * @route   GET /api/v1/admin/categories/:id
 * @desc    Get single category with breadcrumbs and children
 * @access  Private (Admin)
 */
router.get('/:id', adminLimiter, validateParams(categoryParamIdSchema), getCategoryById);

/**
 * @route   POST /api/v1/admin/categories
 * @desc    Create a category (accepts JSON or multipart/form-data image)
 * @access  Private (Admin with categories:manage)
 */
router.post(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  uploadSingleImage,
  validate(createAdminCategorySchema),
  createCategory
);

/**
 * @route   PUT /api/v1/admin/categories/:id
 * @desc    Update a category with circular hierarchy safeguards
 * @access  Private (Admin with categories:manage)
 */
router.put(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validateParams(categoryParamIdSchema),
  uploadSingleImage,
  validate(updateAdminCategorySchema),
  updateCategory
);

/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Delete or soft-delete a category
 * @access  Private (Admin with categories:manage)
 */
router.delete(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validateParams(categoryParamIdSchema),
  deleteCategory
);

export default router;
