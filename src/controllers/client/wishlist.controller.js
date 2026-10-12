import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getCustomerWishlistService,
  addToWishlistService,
  removeFromWishlistService,
  toggleWishlistService,
  clearWishlistService,
  getWishlistProductIdsService,
  wishlistAddToCartService,
} from '../../services/client/wishlist.service.js';

/**
 * Get paginated customer wishlist
 * GET /api/v1/wishlist
 * GET /api/wishlist
 */
export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await getCustomerWishlistService({
      userId,
      query: req.query,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Wishlist retrieved successfully',
      data: result.items,
      pagination: result.pagination,
      meta: {
        wishlistId: result.wishlistId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add product to customer wishlist
 * POST /api/v1/wishlist
 * POST /api/wishlist
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    const result = await addToWishlistService({
      userId,
      productId,
    });

    return sendSuccess(res, {
      statusCode: result.isNew ? HTTP_STATUS.CREATED : HTTP_STATUS.OK,
      message: result.message,
      data: result.item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove product from customer wishlist
 * DELETE /api/v1/wishlist/:productId
 * DELETE /api/wishlist/:productId
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await removeFromWishlistService({
      userId,
      productId,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle product in customer wishlist (heart button helper)
 * POST /api/v1/wishlist/toggle
 * POST /api/wishlist/toggle
 */
export const toggleWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    const result = await toggleWishlistService({
      userId,
      productId,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all items from customer wishlist
 * DELETE /api/v1/wishlist
 * DELETE /api/wishlist
 */
export const clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await clearWishlistService(userId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fast lookup for wishlisted product IDs for frontend heart active state
 * GET /api/v1/wishlist/ids
 * GET /api/wishlist/ids
 */
export const getWishlistProductIds = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productIds = await getWishlistProductIdsService(userId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Wishlist product IDs retrieved successfully',
      data: productIds,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or move a wishlisted product into customer's cart
 * POST /api/v1/wishlist/:productId/add-to-cart
 * POST /api/wishlist/:productId/add-to-cart
 */
export const wishlistAddToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await wishlistAddToCartService({
      userId,
      productId,
      payload: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: result.cart,
      meta: {
        moved: result.moved,
      },
    });
  } catch (error) {
    next(error);
  }
};
