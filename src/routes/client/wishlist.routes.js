import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import {
  addToWishlistSchema,
  wishlistQuerySchema,
  wishlistProductParamSchema,
  wishlistAddToCartSchema,
} from '../../validators/client/wishlist.validator.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
  getWishlistProductIds,
  wishlistAddToCart,
} from '../../controllers/client/wishlist.controller.js';

const router = Router();

// Wishlist requires authenticated customer
router.use(authenticate);

/**
 * @route   GET /api/v1/wishlist (or /api/wishlist)
 * @desc    Get paginated customer wishlist with search, sort, and filters
 * @access  Private (Authenticated Customer)
 */
router.get('/', validateQuery(wishlistQuerySchema), getWishlist);

/**
 * @route   GET /api/v1/wishlist/ids
 * @desc    Fast retrieval of wishlisted product IDs for frontend heart active states
 * @access  Private (Authenticated Customer)
 */
router.get('/ids', getWishlistProductIds);

/**
 * @route   POST /api/v1/wishlist
 * @desc    Add product to customer wishlist (Idempotent)
 * @access  Private (Authenticated Customer)
 */
router.post('/', validate(addToWishlistSchema), addToWishlist);

/**
 * @route   POST /api/v1/wishlist/toggle
 * @desc    Toggle product in wishlist (adds if not present, removes if present)
 * @access  Private (Authenticated Customer)
 */
router.post('/toggle', validate(addToWishlistSchema), toggleWishlist);

/**
 * @route   DELETE /api/v1/wishlist
 * @desc    Clear entire customer wishlist
 * @access  Private (Authenticated Customer)
 */
router.delete('/', clearWishlist);

/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove a specific product from customer wishlist
 * @access  Private (Authenticated Customer)
 */
router.delete('/:productId', validateParams(wishlistProductParamSchema), removeFromWishlist);

/**
 * @route   POST /api/v1/wishlist/:productId/add-to-cart
 * @desc    Add or move wishlisted product to active cart with variant selection
 * @access  Private (Authenticated Customer)
 */
router.post(
  '/:productId/add-to-cart',
  validateParams(wishlistProductParamSchema),
  validate(wishlistAddToCartSchema),
  wishlistAddToCart
);

export default router;
