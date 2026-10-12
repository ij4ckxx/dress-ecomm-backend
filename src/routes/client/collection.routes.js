import { Router } from 'express';
import {
  listCollections,
  getCollectionDetails,
} from '../../controllers/client/collection.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/collections (or /api/collections)
 * @desc    Get all active curated collections / lookbooks
 * @access  Public
 */
router.get('/', listCollections);

/**
 * @route   GET /api/v1/collections/:slug (or /api/collections/:slug)
 * @desc    Get collection details and products by slug
 * @access  Public
 */
router.get('/:slug', getCollectionDetails);

export default router;
