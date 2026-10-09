import { Router } from 'express';
import {
  getInventory,
  adjustStock,
  getInventoryTransactions,
  getInventoryAlerts,
  updateStockThreshold,
} from '../../controllers/admin/inventory.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  queryAdminInventorySchema,
  adjustStockSchema,
  queryInventoryTransactionsSchema,
  updateStockThresholdSchema,
} from '../../validators/admin/inventory.validator.js';

const router = Router();

// Global Admin authentication guard for all inventory routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/inventory
 * @desc    Get flattened inventory monitoring table with stock status & warehouse summary
 * @access  Private (Admin with inventory:read)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validateQuery(queryAdminInventorySchema),
  getInventory
);

/**
 * @route   POST /api/v1/admin/inventory/adjust
 * @desc    Adjust stock atomically and log audit transaction
 * @access  Private (Admin with inventory:write)
 */
router.post(
  '/adjust',
  adminLimiter,
  requirePermission(PERMISSIONS.INVENTORY_WRITE),
  validate(adjustStockSchema),
  adjustStock
);

/**
 * @route   GET /api/v1/admin/inventory/transactions
 * @desc    Get paginated inventory audit transaction logs
 * @access  Private (Admin with inventory:read)
 */
router.get(
  '/transactions',
  adminLimiter,
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validateQuery(queryInventoryTransactionsSchema),
  getInventoryTransactions
);

/**
 * @route   GET /api/v1/admin/inventory/alerts
 * @desc    Get urgent low-stock and out-of-stock garment alerts
 * @access  Private (Admin with inventory:read)
 */
router.get(
  '/alerts',
  adminLimiter,
  requirePermission(PERMISSIONS.INVENTORY_READ),
  getInventoryAlerts
);

/**
 * @route   PATCH /api/v1/admin/inventory/threshold
 * @desc    Update safety stock threshold for a variant or product
 * @access  Private (Admin with inventory:write)
 */
router.patch(
  '/threshold',
  adminLimiter,
  requirePermission(PERMISSIONS.INVENTORY_WRITE),
  validate(updateStockThresholdSchema),
  updateStockThreshold
);

export default router;
