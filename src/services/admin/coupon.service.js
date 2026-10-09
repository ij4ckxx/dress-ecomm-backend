import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Retrieves paginated coupons with quota analytics
 */
export const getCouponsService = async ({ query }) => {
  const {
    page = 1,
    limit = 20,
    search,
    status = 'ALL',
    discountType = 'ALL',
    sort = 'newest',
  } = query;

  const skip = (page - 1) * limit;
  const where = {};
  const now = new Date();

  if (discountType !== 'ALL') {
    where.discountType = discountType;
  }

  if (status === 'ACTIVE') {
    where.isActive = true;
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  } else if (status === 'EXPIRED') {
    where.endDate = { lt: now };
  } else if (status === 'INACTIVE') {
    where.isActive = false;
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  let orderBy = { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  if (sort === 'code_asc') orderBy = { code: 'asc' };
  if (sort === 'used_desc') orderBy = { usedCount: 'desc' };

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: { select: { usages: true } },
      },
    }),
    prisma.coupon.count({ where }),
  ]);

  // Map with computed status & quota remaining
  const formattedCoupons = coupons.map((c) => {
    let computedStatus = 'ACTIVE';
    if (!c.isActive) {
      computedStatus = 'INACTIVE';
    } else if (now > new Date(c.endDate)) {
      computedStatus = 'EXPIRED';
    } else if (now < new Date(c.startDate)) {
      computedStatus = 'SCHEDULED';
    } else if (c.usedCount >= c.usageLimit) {
      computedStatus = 'DEPLETED';
    }

    return {
      ...c,
      computedStatus,
      remainingUses: Math.max(0, c.usageLimit - c.usedCount),
    };
  });

  return {
    coupons: formattedCoupons,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves coupon detail with past usage history
 */
export const getCouponByIdService = async (couponId) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: {
      usages: {
        take: 50,
        orderBy: { usedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          order: { select: { id: true, orderNumber: true, totalAmount: true } },
        },
      },
    },
  });

  if (!coupon) {
    throw createServiceError('Coupon not found', HTTP_STATUS.NOT_FOUND, 'COUPON_NOT_FOUND');
  }

  return coupon;
};

/**
 * Creates a new coupon with uniqueness validation
 */
export const createCouponService = async (couponData) => {
  const { code } = couponData;

  const existing = await prisma.coupon.findUnique({
    where: { code },
  });

  if (existing) {
    throw createServiceError(`Coupon with code '${code}' already exists`, HTTP_STATUS.CONFLICT, 'COUPON_ALREADY_EXISTS');
  }

  const coupon = await prisma.coupon.create({
    data: {
      ...couponData,
      startDate: new Date(couponData.startDate),
      endDate: new Date(couponData.endDate),
    },
  });

  return coupon;
};

/**
 * Updates an existing coupon
 */
export const updateCouponService = async ({ couponId, couponData }) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) {
    throw createServiceError('Coupon not found', HTTP_STATUS.NOT_FOUND, 'COUPON_NOT_FOUND');
  }

  if (couponData.code && couponData.code !== coupon.code) {
    const existing = await prisma.coupon.findUnique({
      where: { code: couponData.code },
    });
    if (existing) {
      throw createServiceError(`Coupon code '${couponData.code}' is already in use`, HTTP_STATUS.CONFLICT, 'COUPON_CODE_TAKEN');
    }
  }

  const dataToUpdate = { ...couponData };
  if (couponData.startDate) dataToUpdate.startDate = new Date(couponData.startDate);
  if (couponData.endDate) dataToUpdate.endDate = new Date(couponData.endDate);

  const updated = await prisma.coupon.update({
    where: { id: couponId },
    data: dataToUpdate,
  });

  return updated;
};

/**
 * Toggles coupon active status
 */
export const toggleCouponStatusService = async ({ couponId, isActive }) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) {
    throw createServiceError('Coupon not found', HTTP_STATUS.NOT_FOUND, 'COUPON_NOT_FOUND');
  }

  const updated = await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive },
  });

  return updated;
};

/**
 * Deletes coupon if unused, otherwise soft-deactivates
 */
export const deleteCouponService = async (couponId) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: { _count: { select: { usages: true } } },
  });

  if (!coupon) {
    throw createServiceError('Coupon not found', HTTP_STATUS.NOT_FOUND, 'COUPON_NOT_FOUND');
  }

  if (coupon._count.usages > 0) {
    // Soft-deactivate to protect order ledger
    const deactivated = await prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });

    return {
      action: 'DEACTIVATED',
      message: `Coupon has ${coupon._count.usages} historical order usages. It was deactivated instead of permanently deleted to safeguard invoice history.`,
      coupon: deactivated,
    };
  }

  await prisma.coupon.delete({
    where: { id: couponId },
  });

  return {
    action: 'DELETED',
    message: `Coupon '${coupon.code}' successfully deleted`,
  };
};
