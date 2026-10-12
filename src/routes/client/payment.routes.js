import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import { verifyPaymentSchema } from '../../validators/checkout.validator.js';
import { verifyPaymentHandler } from '../../controllers/client/checkout.controller.js';

const router = Router();

// Payment verification requires customer authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/payments/verify (or /api/payments/verify)
 * @desc    Verify Razorpay payment signature and mark order as confirmed
 * @access  Private (Authenticated Customer)
 */
router.post('/verify', validate(verifyPaymentSchema), verifyPaymentHandler);

export default router;
