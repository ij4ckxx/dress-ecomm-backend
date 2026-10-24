import { Router } from 'express';
import {
  getAdminReviews,
  getAdminReviewById,
  updateReviewStatus,
  adminReplyToReview,
  deleteAdminReply,
  deleteAdminReview,
  getAdminReviewAnalytics,
} from '../../controllers/admin/review.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  adminReviewQuerySchema,
  updateReviewStatusSchema,
  adminReplySchema,
  adminReviewParamIdSchema,
} from '../../validators/admin/review.validator.js';

const router = Router();

// Global Admin authentication guard for all admin review routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get paginated store reviews with filtering, sorting, and search
 * @access  Private (Admin with reviews:read)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.REVIEWS_READ),
  validateQuery(adminReviewQuerySchema),
  getAdminReviews
);

/**
 * @route   GET /api/v1/admin/reviews/analytics
 * @desc    Get storewide review telemetry and rating analytics
 * @access  Private (Admin with analytics:read)
 */
router.get(
  '/analytics',
  adminLimiter,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  getAdminReviewAnalytics
);

/**
 * @route   GET /api/v1/admin/reviews/:id
 * @desc    Get single review complete detail with customer & product profile
 * @access  Private (Admin with reviews:read)
 */
router.get(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.REVIEWS_READ),
  validateParams(adminReviewParamIdSchema),
  getAdminReviewById
);

/**
 * @route   PATCH /api/v1/admin/reviews/:id/status
 * @desc    Update review moderation status (APPROVED, REJECTED, FLAGGED, PENDING)
 * @access  Private (Admin with reviews:write)
 */
router.patch(
  '/:id/status',
  adminLimiter,
  requirePermission(PERMISSIONS.REVIEWS_WRITE),
  validateParams(adminReviewParamIdSchema),
  validate(updateReviewStatusSchema),
  updateReviewStatus
);

/**
 * @route   POST /api/v1/admin/reviews/:id/reply
 * @desc    Post or update official store response to a review
 * @access  Private (Admin with reviews:write)
 */
router.post(
  '/:id/reply',
  adminLimiter,
  requirePermission(PERMISSIONS.REVIEWS_WRITE),
  validateParams(adminReviewParamIdSchema),
  validate(adminReplySchema),
  adminReplyToReview
);

/**
 * @route   DELETE /api/v1/admin/reviews/:id/reply
 * @desc    Delete official store response from a review
 * @access  Private (Admin with reviews:write)
 */
router.delete(
  '/:id/reply',
  adminLimiter,
  requirePermission(PERMISSIONS.REVIEWS_WRITE),
  validateParams(adminReviewParamIdSchema),
  deleteAdminReply
);

/**
 * @route   DELETE /api/v1/admin/reviews/:id
 * @desc    Permanently delete a review
 * @access  Private (Admin with reviews:delete)
 */
router.delete(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.REVIEWS_DELETE),
  validateParams(adminReviewParamIdSchema),
  deleteAdminReview
);

export default router;
