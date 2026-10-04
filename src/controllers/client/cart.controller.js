import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { CART_HEADERS } from '../../constants/cart.constants.js';
import {
  getOrCreateCart,
  getCartDetails,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeGuestCart,
  getCartMetafields,
  upsertCartMetafield,
  updateCartMetafield,
  deleteCartMetafield,
  getCartItemMetafields,
  upsertCartItemMetafield,
  updateCartItemMetafield,
  deleteCartItemMetafield,
} from '../../services/client/cart.service.js';

/**
 * Extracts userId, guestToken, and cartId from request
 * @param {import('express').Request} req
 * @returns {{ userId: string|null, guestToken: string|null, cartId: string|null }}
 */
const extractCartContext = (req) => {
  const userId = req.user?.id || null;
  const guestToken =
    req.headers[CART_HEADERS.GUEST_CART_TOKEN] ||
    req.headers[CART_HEADERS.CART_TOKEN] ||
    req.headers[CART_HEADERS.GUEST_TOKEN] ||
    req.query.guestToken ||
    req.body?.guestToken ||
    null;
  const cartId = req.params?.cartId || null;

  return { userId, guestToken, cartId };
};

/**
 * Sets guest cart token in response headers if present
 * @param {import('express').Response} res
 * @param {string|null} guestToken
 */
const attachGuestHeader = (res, guestToken) => {
  if (guestToken) {
    res.setHeader(CART_HEADERS.GUEST_CART_TOKEN, guestToken);
  }
};

/**
 * Get active cart for current customer or guest
 */
export const getCart = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const cart = await getCartDetails(context);

    attachGuestHeader(res, cart.guestToken);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart retrieved successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates or gets active cart
 */
export const createCart = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const cart = await getOrCreateCart(context);

    attachGuestHeader(res, cart.guestToken);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Cart created or retrieved successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an item to cart
 */
export const addItem = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const cart = await addItemToCart(context, req.body);

    attachGuestHeader(res, cart.guestToken);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Item added to cart successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update cart item quantity or modifier configuration
 */
export const updateItem = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { itemId } = req.params;
    const cart = await updateCartItem(context, itemId, req.body);

    attachGuestHeader(res, cart.guestToken);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart item updated successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove an item from cart
 */
export const removeItem = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { itemId } = req.params;
    const cart = await removeCartItem(context, itemId);

    attachGuestHeader(res, cart.guestToken);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Item removed from cart successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all items from cart
 */
export const clearCartItems = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const cart = await clearCart(context);

    attachGuestHeader(res, cart.guestToken);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart cleared successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Merge guest cart into customer cart after login
 */
export const mergeCart = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { guestToken } = req.body;

    const cart = await mergeGuestCart(userId, guestToken);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Guest cart merged successfully into customer cart',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cart Metafields Handlers
 */
export const listCartMetafields = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const metafields = await getCartMetafields(context);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart metafields retrieved successfully',
      data: metafields,
    });
  } catch (error) {
    next(error);
  }
};

export const createCartMetafield = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const metafield = await upsertCartMetafield(context, req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Cart metafield saved successfully',
      data: metafield,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartMetafieldHandler = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { metafieldId } = req.params;
    const updated = await updateCartMetafield(context, metafieldId, req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart metafield updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCartMetafieldHandler = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { metafieldId } = req.params;
    const result = await deleteCartMetafield(context, metafieldId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cart Item Metafields Handlers
 */
export const listCartItemMetafields = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { itemId } = req.params;
    const metafields = await getCartItemMetafields(context, itemId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart item metafields retrieved successfully',
      data: metafields,
    });
  } catch (error) {
    next(error);
  }
};

export const createCartItemMetafield = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { itemId } = req.params;
    const metafield = await upsertCartItemMetafield(context, itemId, req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Cart item metafield saved successfully',
      data: metafield,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItemMetafieldHandler = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { itemId, metafieldId } = req.params;
    const updated = await updateCartItemMetafield(context, itemId, metafieldId, req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart item metafield updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCartItemMetafieldHandler = async (req, res, next) => {
  try {
    const context = extractCartContext(req);
    const { itemId, metafieldId } = req.params;
    const result = await deleteCartItemMetafield(context, itemId, metafieldId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
