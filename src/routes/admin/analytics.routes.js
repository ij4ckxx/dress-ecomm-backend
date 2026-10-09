import { Router } from 'express';
import {
  getOverviewAnalytics,
  getRevenueChart,
  getTopProducts,
  getOrderStatusDistribution,
  purgeAnalyticsCache,
} from '../../controllers/admin/analytics.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validateQuery } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  analyticsPeriodSchema,
  topProductsQuerySchema,
} from '../../validators/admin/analytics.validator.js';

const router = Router();

// Global Admin authentication guard for all analytics routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/analytics/overview
 * @desc    Get aggregated dashboard KPIs with 60-second in-memory caching
 * @access  Private (Admin with analytics:read)
 */
router.get(
  '/overview',
  adminLimiter,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  validateQuery(analyticsPeriodSchema),
  getOverviewAnalytics
);

/**
 * @route   GET /api/v1/admin/analytics/revenue-chart
 * @desc    Get time-series revenue and order volume for dashboard charts
 * @access  Private (Admin with analytics:read)
 */
router.get(
  '/revenue-chart',
  adminLimiter,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  validateQuery(analyticsPeriodSchema),
  getRevenueChart
);

/**
 * @route   GET /api/v1/admin/analytics/top-products
 * @desc    Get best-selling luxury garments by sales volume and revenue
 * @access  Private (Admin with analytics:read)
 */
router.get(
  '/top-products',
  adminLimiter,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  validateQuery(topProductsQuerySchema),
  getTopProducts
);

/**
 * @route   GET /api/v1/admin/analytics/order-distribution
 * @desc    Get status breakdown across all orders for distribution charts
 * @access  Private (Admin with analytics:read)
 */
router.get(
  '/order-distribution',
  adminLimiter,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  getOrderStatusDistribution
);

/**
 * @route   POST /api/v1/admin/analytics/cache/purge
 * @desc    Instantly flush all analytics in-memory caches
 * @access  Private (Admin with analytics:read)
 */
router.post(
  '/cache/purge',
  adminLimiter,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  purgeAnalyticsCache
);

export default router;
