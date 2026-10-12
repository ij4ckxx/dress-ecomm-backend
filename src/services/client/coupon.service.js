import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Validates a coupon code against a subtotal and optional customer ID
 * @param {object} params
 * @param {string} params.code - Coupon code string
 * @param {number} params.subtotal - Cart subtotal amount
 * @param {string|null} [params.userId=null] - Customer user UUID
 * @returns {Promise<{ isValid: boolean, code: string, discountType: string, discountAmount: number, description: string }>}
 */
export const validateCustomerCoupon = async ({ code, subtotal, userId = null }) => {
  if (!code || !code.trim()) {
    throw new AppError('Coupon code is required', HTTP_STATUS.BAD_REQUEST, 'COUPON_REQUIRED');
  }

  const normalizedCode = code.trim().toUpperCase();
  const numericSubtotal = Math.max(0, Number(subtotal) || 0);

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError('Invalid or inactive coupon code', HTTP_STATUS.NOT_FOUND, 'COUPON_NOT_FOUND');
  }

  const now = new Date();
  if (coupon.startDate && now < new Date(coupon.startDate)) {
    throw new AppError('This coupon promotion has not started yet', HTTP_STATUS.BAD_REQUEST, 'COUPON_NOT_STARTED');
  }

  if (coupon.endDate && now > new Date(coupon.endDate)) {
    throw new AppError('This coupon code has expired', HTTP_STATUS.BAD_REQUEST, 'COUPON_EXPIRED');
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('This coupon has reached its maximum usage limit', HTTP_STATUS.BAD_REQUEST, 'COUPON_DEPLETED');
  }

  const minOrder = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
  if (numericSubtotal < minOrder) {
    throw new AppError(
      `This coupon requires a minimum order subtotal of ₹${minOrder.toLocaleString('en-IN')}`,
      HTTP_STATUS.BAD_REQUEST,
      'COUPON_MIN_ORDER_NOT_MET'
    );
  }

  // Calculate discount amount
  const discountVal = Number(coupon.discountValue);
  let discountAmount = 0;

  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = (numericSubtotal * discountVal) / 100;
    const maxCap = coupon.maxDiscountAmount ?? coupon.maxDiscount;
    if (maxCap && Number(maxCap) > 0) {
      discountAmount = Math.min(discountAmount, Number(maxCap));
    }
  } else {
    // FIXED amount
    discountAmount = discountVal;
  }

  // Discount cannot exceed the subtotal
  discountAmount = Math.min(numericSubtotal, Math.round(discountAmount * 100) / 100);

  return {
    isValid: true,
    code: coupon.code,
    description: coupon.description || '',
    discountType: coupon.discountType,
    discountValue: discountVal,
    discountAmount,
    minOrderAmount: minOrder,
  };
};
