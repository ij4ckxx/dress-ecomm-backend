import { Router } from 'express';
import { getPublicSettings } from '../../controllers/client/settings.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/settings (or /api/settings)
 * @desc    Get public storefront configuration, active theme, feature flags & shipping rules
 * @access  Public
 */
router.get('/', getPublicSettings);

export default router;
