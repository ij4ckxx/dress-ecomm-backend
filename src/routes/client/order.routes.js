import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import {
  orderNumberParamSchema,
  customerOrderQuerySchema,
  customerCancelOrderSchema,
  trackOrderQuerySchema,
  trackOrderBodySchema,
} from '../../validators/client/order.validator.js';
import {
  getCustomerOrders,
  getCustomerOrderByNumber,
  getOrderConfirmation,
  customerCancelOrder,
  customerReorder,
  trackOrder,
} from '../../controllers/client/order.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/orders/track
 * @desc    Public & authenticated order tracking by orderNumber and email/phone query
 * @access  Public / Optional Authenticated Customer
 */
router.get('/track', optionalAuthenticate, validateQuery(trackOrderQuerySchema), trackOrder);

/**
 * @route   POST /api/v1/orders/track
 * @desc    Public & authenticated order tracking via form body
 * @access  Public / Optional Authenticated Customer
 */
router.post('/track', optionalAuthenticate, validate(trackOrderBodySchema), trackOrder);

/**
 * @route   GET /api/v1/orders/:orderNumber/track
 * @desc    Direct order tracking endpoint (logged-in user or guest with ?email= / ?phone=)
 * @access  Public / Optional Authenticated Customer
 */
router.get(
  '/:orderNumber/track',
  optionalAuthenticate,
  validateParams(orderNumberParamSchema),
  validateQuery(trackOrderQuerySchema.partial()),
  trackOrder
);

// All customer account order management endpoints require customer authentication
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
