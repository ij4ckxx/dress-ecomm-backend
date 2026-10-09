import { Router } from 'express';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
} from '../../controllers/admin/coupon.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  couponParamIdSchema,
  queryAdminCouponsSchema,
  createCouponSchema,
  updateCouponSchema,
  toggleCouponStatusSchema,
} from '../../validators/admin/coupon.validator.js';

const router = Router();

// Global Admin authentication guard for all coupon routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/coupons
 * @desc    Get paginated coupon list with status and quota filters
 * @access  Private (Admin with coupons:manage)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validateQuery(queryAdminCouponsSchema),
  getCoupons
);

/**
 * @route   GET /api/v1/admin/coupons/:id
 * @desc    Get coupon details and recent usage history
 * @access  Private (Admin with coupons:manage)
 */
router.get(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validateParams(couponParamIdSchema),
  getCouponById
);

/**
 * @route   POST /api/v1/admin/coupons
 * @desc    Create a new promotional coupon code
 * @access  Private (Admin with coupons:manage)
 */
router.post(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validate(createCouponSchema),
  createCoupon
);

/**
 * @route   PUT /api/v1/admin/coupons/:id
 * @desc    Update coupon configuration
 * @access  Private (Admin with coupons:manage)
 */
router.put(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validateParams(couponParamIdSchema),
  validate(updateCouponSchema),
  updateCoupon
);

/**
 * @route   PATCH /api/v1/admin/coupons/:id/status
 * @desc    Quick toggle active or inactive status
 * @access  Private (Admin with coupons:manage)
 */
router.patch(
  '/:id/status',
  adminLimiter,
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validateParams(couponParamIdSchema),
  validate(toggleCouponStatusSchema),
  toggleCouponStatus
);

/**
 * @route   DELETE /api/v1/admin/coupons/:id
 * @desc    Delete coupon if unused, otherwise safe soft-deactivate
 * @access  Private (Admin with coupons:manage)
 */
router.delete(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validateParams(couponParamIdSchema),
  deleteCoupon
);

export default router;
