import {
  getCouponsService,
  getCouponByIdService,
  createCouponService,
  updateCouponService,
  toggleCouponStatusService,
  deleteCouponService,
} from '../../services/admin/coupon.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

export const getCoupons = async (req, res, next) => {
  try {
    const result = await getCouponsService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupons fetched successfully',
      data: result.coupons,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getCouponById = async (req, res, next) => {
  try {
    const coupon = await getCouponByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon details fetched successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await createCouponService(req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: `Coupon '${coupon.code}' created successfully`,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const updated = await updateCouponService({
      couponId: req.params.id,
      couponData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Coupon '${updated.code}' updated successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCouponStatus = async (req, res, next) => {
  try {
    const updated = await toggleCouponStatusService({
      couponId: req.params.id,
      isActive: req.body.isActive,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Coupon status changed to ${updated.isActive ? 'Active' : 'Inactive'}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const result = await deleteCouponService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: result.coupon || null,
    });
  } catch (error) {
    next(error);
  }
};
