import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getCustomerOrdersService,
  getCustomerOrderByNumberService,
  customerCancelOrderService,
  customerReorderService,
  trackOrderService,
} from '../../services/client/order.service.js';
import { getOrderConfirmationByNumber } from '../../services/client/checkout.service.js';

/**
 * Controller to fetch paginated customer order history
 * GET /api/v1/orders
 * GET /api/orders
 */
export const getCustomerOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await getCustomerOrdersService({
      userId,
      query: req.query,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Customer order history retrieved successfully',
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch detailed order information by orderNumber
 * GET /api/v1/orders/:orderNumber
 * GET /api/orders/:orderNumber
 */
export const getCustomerOrderByNumber = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderNumber } = req.params;

    const order = await getCustomerOrderByNumberService({
      userId,
      orderNumber,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Order details retrieved successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch post-checkout order confirmation
 * GET /api/v1/orders/:orderNumber/confirmation
 * GET /api/orders/:orderNumber/confirmation
 */
export const getOrderConfirmation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderNumber } = req.params;

    const confirmation = await getOrderConfirmationByNumber({
      userId,
      orderNumber,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Order confirmation retrieved successfully',
      data: confirmation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for customer self-cancellation of PENDING orders
 * POST /api/v1/orders/:orderNumber/cancel
 * POST /api/orders/:orderNumber/cancel
 */
export const customerCancelOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderNumber } = req.params;
    const { reason } = req.body || {};

    const cancelled = await customerCancelOrderService({
      userId,
      orderNumber,
      reason,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Order #${cancelled.orderNumber} successfully cancelled`,
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to reorder items from a past order into active cart
 * POST /api/v1/orders/:orderNumber/reorder
 * POST /api/orders/:orderNumber/reorder
 */
export const customerReorder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderNumber } = req.params;

    const result = await customerReorderService({
      userId,
      orderNumber,
    });

    const addedCount = result.addedItems.length;
    const skippedCount = result.skippedItems.length;

    let message = `${addedCount} item(s) added to your cart`;
    if (skippedCount > 0) {
      message += ` (${skippedCount} unavailable item(s) skipped)`;
    }

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to track order for both authenticated customers and unauthenticated guests
 * GET /api/v1/orders/track
 * POST /api/v1/orders/track
 * GET /api/v1/orders/:orderNumber/track
 */
export const trackOrder = async (req, res, next) => {
  try {
    const orderNumber = req.params.orderNumber || req.query.orderNumber || req.body.orderNumber;
    const email = req.query.email || req.body.email;
    const phone = req.query.phone || req.body.phone;
    const emailOrPhone = req.query.emailOrPhone || req.body.emailOrPhone;
    const userId = req.user?.id || null;

    const trackingDetails = await trackOrderService({
      orderNumber,
      email,
      phone,
      emailOrPhone,
      userId,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Order tracking details retrieved successfully',
      data: trackingDetails,
    });
  } catch (error) {
    next(error);
  }
};
