import { Router } from 'express';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  togglePromotionStatus,
  deletePromotion,
} from '../../controllers/admin/promotion.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { uploadBannerImage } from '../../middlewares/upload.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  promotionParamIdSchema,
  queryAdminPromotionsSchema,
  createPromotionSchema,
  updatePromotionSchema,
  togglePromotionStatusSchema,
} from '../../validators/admin/promotion.validator.js';

const router = Router();

// Global Admin authentication guard for all promotion routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/promotions
 * @desc    Get paginated marketing hero campaigns
 * @access  Private (Admin with promotions:manage)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateQuery(queryAdminPromotionsSchema),
  getPromotions
);

/**
 * @route   GET /api/v1/admin/promotions/:id
 * @desc    Get marketing campaign detail
 * @access  Private (Admin with promotions:manage)
 */
router.get(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateParams(promotionParamIdSchema),
  getPromotionById
);

/**
 * @route   POST /api/v1/admin/promotions
 * @desc    Create a new marketing campaign banner with optional image upload
 * @access  Private (Admin with promotions:manage)
 */
router.post(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  uploadBannerImage,
  validate(createPromotionSchema),
  createPromotion
);

/**
 * @route   PUT /api/v1/admin/promotions/:id
 * @desc    Update an existing marketing campaign banner
 * @access  Private (Admin with promotions:manage)
 */
router.put(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateParams(promotionParamIdSchema),
  uploadBannerImage,
  validate(updatePromotionSchema),
  updatePromotion
);

/**
 * @route   PATCH /api/v1/admin/promotions/:id/status
 * @desc    Toggle campaign active status
 * @access  Private (Admin with promotions:manage)
 */
router.patch(
  '/:id/status',
  adminLimiter,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateParams(promotionParamIdSchema),
  validate(togglePromotionStatusSchema),
  togglePromotionStatus
);

/**
 * @route   DELETE /api/v1/admin/promotions/:id
 * @desc    Delete marketing campaign
 * @access  Private (Admin with promotions:manage)
 */
router.delete(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateParams(promotionParamIdSchema),
  deletePromotion
);

export default router;
