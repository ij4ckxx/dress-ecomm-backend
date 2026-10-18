import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../controllers/admin/customer.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { uploadAvatarImage } from '../../middlewares/upload.middleware.js';
import { validateImageExclusivity } from '../../middlewares/imageExclusivity.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  customerParamIdSchema,
  queryAdminCustomersSchema,
  createAdminCustomerSchema,
  updateAdminCustomerSchema,
} from '../../validators/admin/customer.validator.js';

const router = Router();

// All routes here strictly require valid JWT & an administrative role
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/customers
 * @desc    Get paginated customer table with LTV, order counts, and search
 * @access  Private (Admin with users:read)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.USERS_READ),
  validateQuery(queryAdminCustomersSchema),
  getCustomers
);

/**
 * @route   GET /api/v1/admin/customers/:id
 * @desc    Get full Customer 360 profile with order history and saved addresses
 * @access  Private (Admin with users:read)
 */
router.get(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.USERS_READ),
  validateParams(customerParamIdSchema),
  getCustomerById
);

/**
 * @route   POST /api/v1/admin/customers
 * @desc    Create a new customer account (accepts avatar file upload OR avatarUrl, one only)
 * @access  Private (Admin with users:write)
 */
router.post(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.USERS_WRITE),
  uploadAvatarImage,
  validateImageExclusivity({ fileFields: ['avatar', 'image'], urlField: 'avatarUrl', isMultiple: false }),
  validate(createAdminCustomerSchema),
  createCustomer
);

/**
 * @route   PUT /api/v1/admin/customers/:id
 * @desc    Update customer details (accepts avatar file upload OR avatarUrl, one only)
 * @access  Private (Admin with users:write)
 */
router.put(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.USERS_WRITE),
  validateParams(customerParamIdSchema),
  uploadAvatarImage,
  validateImageExclusivity({ fileFields: ['avatar', 'image'], urlField: 'avatarUrl', isMultiple: false }),
  validate(updateAdminCustomerSchema),
  updateCustomer
);

/**
 * @route   DELETE /api/v1/admin/customers/:id
 * @desc    Delete or soft-deactivate customer account
 * @access  Private (Admin with users:write)
 */
router.delete(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.USERS_WRITE),
  validateParams(customerParamIdSchema),
  deleteCustomer
);

export default router;
