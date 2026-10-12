import { Router } from 'express';
import { validateCoupon } from '../../controllers/client/coupon.controller.js';
import { optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import { validateCouponSchema } from '../../validators/coupon.validator.js';

const router = Router();

/**
 * @route   POST /api/v1/coupons/validate (or /api/coupons/validate)
 * @desc    Validate a coupon code against subtotal
 * @access  Public / Customer
 */
router.post('/validate', optionalAuthenticate, validate(validateCouponSchema), validateCoupon);

export default router;
