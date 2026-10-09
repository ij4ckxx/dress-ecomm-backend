import { Router } from 'express';
import {
  getStoreSettings,
  updateStoreSettings,
  updateTheme,
  updateFeatureFlags,
} from '../../controllers/admin/settings.controller.js';
import { authenticate, requireAdmin, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import { adminLimiter } from '../../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  updateStoreSettingsSchema,
  updateThemeSchema,
  updateFeatureFlagsSchema,
} from '../../validators/admin/settings.validator.js';

const router = Router();

// Global Admin authentication guard for all settings routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get store configuration, theme, feature flags, and shipping rules
 * @access  Private (Admin with settings:manage)
 */
router.get(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  getStoreSettings
);

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update general store configuration
 * @access  Private (Admin with settings:manage)
 */
router.put(
  '/',
  adminLimiter,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate(updateStoreSettingsSchema),
  updateStoreSettings
);

/**
 * @route   PATCH /api/v1/admin/settings/theme
 * @desc    Switch active storefront theme
 * @access  Private (Admin with settings:manage)
 */
router.patch(
  '/theme',
  adminLimiter,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate(updateThemeSchema),
  updateTheme
);

/**
 * @route   PATCH /api/v1/admin/settings/features
 * @desc    Toggle or configure storefront feature flags
 * @access  Private (Admin with settings:manage)
 */
router.patch(
  '/features',
  adminLimiter,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate(updateFeatureFlagsSchema),
  updateFeatureFlags
);

export default router;
