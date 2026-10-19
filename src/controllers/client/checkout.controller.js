import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getCheckoutSummary,
  placeOrder,
  verifyPayment,
  getOrderConfirmationByNumber,
} from '../../services/client/checkout.service.js';

/**
 * Controller to preview checkout summary, inventory availability, discounts & taxes
 * POST /api/v1/checkout/summary
 * POST /api/checkout/summary
 */
export const getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const summary = await getCheckoutSummary({
      userId,
      shippingAddressId: req.body?.shippingAddressId || null,
      shippingAddress: req.body?.shippingAddress || null,
      couponCode: req.body?.couponCode || null,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Checkout summary calculated successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to place order (initiates Razorpay or places COD order)
 * POST /api/v1/checkout
 * POST /api/checkout
 */
export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await placeOrder({
      userId,
      payload: req.body,
    });

    let successMessage = 'Order created, please complete payment with Razorpay';
    if (result.order.paymentMethod === 'COD') {
      successMessage = 'Order placed successfully via Cash on Delivery';
    } else if (result.order.paymentMethod === 'UPI_QR') {
      successMessage = 'Order placed successfully via Direct UPI QR Payment. Awaiting payment verification.';
    }

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: successMessage,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to verify Razorpay payment signature
 * POST /api/v1/payments/verify
 * POST /api/payments/verify
 */
export const verifyPaymentHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await verifyPayment({
      userId,
      payload: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Payment verified and order confirmed successfully',
      data: result,
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
