import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { validateCustomerCoupon } from '../../services/client/coupon.service.js';

/**
 * Controller to validate a coupon code against a subtotal
 * POST /api/v1/coupons/validate
 * POST /api/coupons/validate
 */
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;
    const userId = req.user?.id || null;

    const couponResult = await validateCustomerCoupon({
      code,
      subtotal,
      userId,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon code applied successfully',
      data: couponResult,
    });
  } catch (error) {
    next(error);
  }
};
