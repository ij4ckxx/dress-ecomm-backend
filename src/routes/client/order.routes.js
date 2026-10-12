import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import {
  orderNumberParamSchema,
  customerOrderQuerySchema,
  customerCancelOrderSchema,
} from '../../validators/client/order.validator.js';
import {
  getCustomerOrders,
  getCustomerOrderByNumber,
  getOrderConfirmation,
  customerCancelOrder,
  customerReorder,
} from '../../controllers/client/order.controller.js';

const router = Router();

// All customer order endpoints require customer authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/orders (or /api/orders)
 * @desc    Get paginated order history for the authenticated customer
 * @access  Private (Authenticated Customer)
 */
router.get('/', validateQuery(customerOrderQuerySchema), getCustomerOrders);

/**
 * @route   GET /api/v1/orders/:orderNumber/confirmation
 * @desc    Get post-checkout order confirmation details by human-readable order number
 * @access  Private (Authenticated Customer)
 */
router.get('/:orderNumber/confirmation', validateParams(orderNumberParamSchema), getOrderConfirmation);

/**
 * @route   GET /api/v1/orders/:orderNumber
 * @desc    Get full order details, tracking, timeline, and public metafields
 * @access  Private (Authenticated Customer)
 */
router.get('/:orderNumber', validateParams(orderNumberParamSchema), getCustomerOrderByNumber);

/**
 * @route   POST /api/v1/orders/:orderNumber/cancel
 * @desc    Self-cancellation for PENDING orders with atomic inventory return
 * @access  Private (Authenticated Customer)
 */
router.post(
  '/:orderNumber/cancel',
  validateParams(orderNumberParamSchema),
  validate(customerCancelOrderSchema),
  customerCancelOrder
);

/**
 * @route   POST /api/v1/orders/:orderNumber/reorder
 * @desc    Merge eligible products from a previous order into customer's active cart
 * @access  Private (Authenticated Customer)
 */
router.post('/:orderNumber/reorder', validateParams(orderNumberParamSchema), customerReorder);

export default router;
