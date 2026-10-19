import { Router } from 'express';
import { getPublicSettings, getPublicPaymentMethods } from '../../controllers/client/settings.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/settings (or /api/settings)
 * @desc    Get public storefront configuration, active theme, feature flags & shipping rules
 * @access  Public
 */
router.get('/', getPublicSettings);

/**
 * @route   GET /api/v1/settings/payment-methods (or /api/settings/payment-methods)
 * @desc    Get public payment methods configuration (Razorpay, COD, UPI_QR)
 * @access  Public
 */
router.get('/payment-methods', getPublicPaymentMethods);

export default router;

