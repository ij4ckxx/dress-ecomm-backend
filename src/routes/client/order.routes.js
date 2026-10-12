import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validateParams } from '../../middlewares/validate.js';
import { orderNumberParamSchema } from '../../validators/checkout.validator.js';
import { getOrderConfirmation } from '../../controllers/client/checkout.controller.js';

const router = Router();

// Order confirmation requires customer authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/orders/:orderNumber/confirmation (or /api/orders/:orderNumber/confirmation)
 * @desc    Get post-checkout order confirmation details by order number
 * @access  Private (Authenticated Customer)
 */
router.get('/:orderNumber/confirmation', validateParams(orderNumberParamSchema), getOrderConfirmation);

export default router;
