import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import {
  checkoutSummarySchema,
  placeOrderSchema,
} from '../../validators/checkout.validator.js';
import {
  getSummary,
  createOrder,
} from '../../controllers/client/checkout.controller.js';

const router = Router();

// Checkout requires authenticated customer login
router.use(authenticate);

/**
 * @route   POST /api/v1/checkout/summary (or /api/checkout/summary)
 * @desc    Get pre-checkout summary, subtotal, tax, shipping, discount & stock check
 * @access  Private (Authenticated Customer)
 */
router.post('/summary', validate(checkoutSummarySchema), getSummary);

/**
 * @route   POST /api/v1/checkout (or /api/checkout)
 * @desc    Place order (Razorpay initiation or COD placement)
 * @access  Private (Authenticated Customer)
 */
router.post('/', validate(placeOrderSchema), createOrder);

export default router;
