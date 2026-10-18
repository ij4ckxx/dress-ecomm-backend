import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import { uploadAvatarImage } from '../../middlewares/upload.middleware.js';
import { validateImageExclusivity } from '../../middlewares/imageExclusivity.js';
import {
  updateAccountDetailsSchema,
  updateAvatarOnlySchema,
  changePasswordSchema,
} from '../../validators/customer.validator.js';
import {
  getAccountDetails,
  updateAccountDetails,
  updateAvatar,
  changePassword,
} from '../../controllers/client/customer.controller.js';
import addressRoutes from './address.routes.js';

const router = Router();

// Mount Customer Address Management routes under /addresses
router.use('/addresses', addressRoutes);

/**
 * @route   GET /api/v1/customer/account (or /api/customer/account)
 * @desc    Get currently authenticated customer profile
 * @access  Private (Authenticated Customer)
 */
router.get('/account', authenticate, getAccountDetails);

/**
 * @route   PATCH /api/v1/customer/account (or /api/customer/account)
 * @desc    Update customer profile details (accepts avatar file upload OR avatarUrl, one only)
 * @access  Private (Authenticated Customer)
 */
router.patch(
  '/account',
  authenticate,
  uploadAvatarImage,
  validateImageExclusivity({ fileFields: ['avatar', 'image'], urlField: 'avatarUrl', isMultiple: false }),
  validate(updateAccountDetailsSchema),
  updateAccountDetails
);
router.put(
  '/account',
  authenticate,
  uploadAvatarImage,
  validateImageExclusivity({ fileFields: ['avatar', 'image'], urlField: 'avatarUrl', isMultiple: false }),
  validate(updateAccountDetailsSchema),
  updateAccountDetails
);

/**
 * @route   POST /api/v1/customer/account/avatar (or /api/customer/account/avatar)
 * @desc    Dedicated endpoint to update avatar (accepts file upload OR avatarUrl, one only)
 * @access  Private (Authenticated Customer)
 */
router.post(
  '/account/avatar',
  authenticate,
  uploadAvatarImage,
  validateImageExclusivity({ fileFields: ['avatar', 'image'], urlField: 'avatarUrl', isMultiple: false }),
  validate(updateAvatarOnlySchema),
  updateAvatar
);

/**
 * @route   PATCH /api/v1/customer/account/password (or /api/customer/account/password)
 * @desc    Change customer password
 * @access  Private (Authenticated Customer)
 */
router.patch('/account/password', authenticate, validate(changePasswordSchema), changePassword);
router.put('/account/password', authenticate, validate(changePasswordSchema), changePassword);

export default router;
