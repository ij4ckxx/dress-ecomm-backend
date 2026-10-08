import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  getAvailablePermissions,
} from '../../controllers/admin/user.controller.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery } from '../../middlewares/validate.js';
import { adminLimiter, adminAuthLimiter } from '../../middlewares/rateLimiter.js';
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  queryAdminUsersSchema,
} from '../../validators/admin/user.validator.js';

const router = Router();

// All routes here strictly require valid JWT & an administrative role
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/users/permissions/delegatable
 * @desc    Get permissions the current admin can grant to down-level staff
 * @access  Private (Admin)
 */
router.get('/permissions/delegatable', adminLimiter, getAvailablePermissions);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create a down-level user with assigned capabilities
 * @access  Private (SUPER_ADMIN, STORE_ADMIN, STAFF)
 */
router.post(
  '/',
  adminAuthLimiter,
  validate(createAdminUserSchema),
  createUser
);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get paginated users visible according to hierarchy
 * @access  Private (Admin)
 */
router.get(
  '/',
  adminLimiter,
  validateQuery(queryAdminUsersSchema),
  getUsers
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user details
 * @access  Private (Admin)
 */
router.get('/:id', adminLimiter, getUserById);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update subordinate user details or permissions
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  adminLimiter,
  validate(updateAdminUserSchema),
  updateUser
);

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Activate or deactivate a subordinate account
 * @access  Private (Admin)
 */
router.patch(
  '/:id/status',
  adminLimiter,
  toggleUserStatus
);

export default router;
