import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderShipping,
  updateOrderNotes,
  cancelOrder,
  exportOrdersCsv,
} from '../../controllers/admin/order.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  orderParamIdSchema,
  queryAdminOrdersSchema,
  updateOrderStatusSchema,
  updateOrderShippingSchema,
  updateOrderNotesSchema,
  cancelOrderSchema,
} from '../../validators/admin/order.validator.js';

const router = Router();

// Global Admin authentication guard for all order routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get paginated orders list with fulfillment filters and summary stats
 * @access  Private (Admin with orders:read)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.ORDERS_READ),
  validateQuery(queryAdminOrdersSchema),
  getOrders
);

/**
 * @route   GET /api/v1/admin/orders/export/csv
 * @desc    Export filtered orders manifest as CSV for courier pickup & warehouse slips
 * @access  Private (Admin with orders:read)
 */
router.get(
  '/export/csv',
  adminLimiter,
  requirePermission(PERMISSIONS.ORDERS_READ),
  exportOrdersCsv
);

/**
 * @route   GET /api/v1/admin/orders/:id
 * @desc    Get full order breakdown, items, customer info, payments, and history
 * @access  Private (Admin with orders:read)
 */
router.get(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.ORDERS_READ),
  validateParams(orderParamIdSchema),
  getOrderById
);

/**
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @desc    Advance order status via state machine
 * @access  Private (Admin with orders:write)
 */
router.patch(
  '/:id/status',
  adminLimiter,
  requirePermission(PERMISSIONS.ORDERS_WRITE),
  validateParams(orderParamIdSchema),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

/**
 * @route   PATCH /api/v1/admin/orders/:id/shipping
 * @desc    Assign courier tracking details and mark order as dispatched
 * @access  Private (Admin with orders:write)
 */
router.patch(
  '/:id/shipping',
  adminLimiter,
  requirePermission(PERMISSIONS.ORDERS_WRITE),
  validateParams(orderParamIdSchema),
  validate(updateOrderShippingSchema),
  updateOrderShipping
);

/**
 * @route   PATCH /api/v1/admin/orders/:id/notes
 * @desc    Update private internal notes on an order
 * @access  Private (Admin with orders:write)
 */
router.patch(
  '/:id/notes',
  adminLimiter,
  requirePermission(PERMISSIONS.ORDERS_WRITE),
  validateParams(orderParamIdSchema),
  validate(updateOrderNotesSchema),
  updateOrderNotes
);

/**
 * @route   POST /api/v1/admin/orders/:id/cancel
 * @desc    Cancel order with mandatory reason and restore stock
 * @access  Private (Admin with orders:cancel)
 */
router.post(
  '/:id/cancel',
  adminLimiter,
  requirePermission(PERMISSIONS.ORDERS_CANCEL),
  validateParams(orderParamIdSchema),
  validate(cancelOrderSchema),
  cancelOrder
);

export default router;
