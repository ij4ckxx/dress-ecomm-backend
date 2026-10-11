import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import {
  updateAccountDetailsSchema,
  changePasswordSchema,
} from '../../validators/customer.validator.js';
import {
  getAccountDetails,
  updateAccountDetails,
  changePassword,
} from '../../controllers/client/customer.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/customer/account (or /api/customer/account)
 * @desc    Get currently authenticated customer profile
 * @access  Private (Authenticated Customer)
 */
router.get('/account', authenticate, getAccountDetails);

/**
 * @route   PATCH /api/v1/customer/account (or /api/customer/account)
 * @desc    Update customer profile details
 * @access  Private (Authenticated Customer)
 */
router.patch('/account', authenticate, validate(updateAccountDetailsSchema), updateAccountDetails);
router.put('/account', authenticate, validate(updateAccountDetailsSchema), updateAccountDetails);

/**
 * @route   PATCH /api/v1/customer/account/password (or /api/customer/account/password)
 * @desc    Change customer password
 * @access  Private (Authenticated Customer)
 */
router.patch('/account/password', authenticate, validate(changePasswordSchema), changePassword);
router.put('/account/password', authenticate, validate(changePasswordSchema), changePassword);

export default router;
