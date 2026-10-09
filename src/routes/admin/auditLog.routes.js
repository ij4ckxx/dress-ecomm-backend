import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLogById,
} from '../../controllers/admin/auditLog.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validateQuery, validateParams } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  auditLogParamIdSchema,
  queryAuditLogsSchema,
} from '../../validators/admin/auditLog.validator.js';

const router = Router();

// Global Admin authentication guard for all audit log routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get paginated administrative audit logs
 * @access  Private (Admin with settings:manage)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validateQuery(queryAuditLogsSchema),
  getAuditLogs
);

/**
 * @route   GET /api/v1/admin/audit-logs/:id
 * @desc    Get single audit log entry detail
 * @access  Private (Admin with settings:manage)
 */
router.get(
  '/:id',
  adminLimiter,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validateParams(auditLogParamIdSchema),
  getAuditLogById
);

export default router;
