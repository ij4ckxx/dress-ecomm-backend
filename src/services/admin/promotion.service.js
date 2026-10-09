import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Retrieves paginated promotional hero campaigns
 */
export const getPromotionsService = async ({ query }) => {
  const { page = 1, limit = 20, search, status = 'ALL', sort = 'sortOrder_asc' } = query;
  const skip = (page - 1) * limit;
  const where = {};
  const now = new Date();

  if (status === 'ACTIVE') {
    where.isActive = true;
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  } else if (status === 'INACTIVE') {
    where.isActive = false;
  } else if (status === 'EXPIRED') {
    where.endDate = { lt: now };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { subtitle: { contains: search, mode: 'insensitive' } },
      { badge: { contains: search, mode: 'insensitive' } },
      { couponCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  let orderBy = { sortOrder: 'asc' };
  if (sort === 'newest') orderBy = { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };

  const [promotions, total] = await Promise.all([
    prisma.promotionCampaign.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.promotionCampaign.count({ where }),
  ]);

  return {
    promotions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single campaign detail
 */
export const getPromotionByIdService = async (promoId) => {
  const promo = await prisma.promotionCampaign.findUnique({
    where: { id: promoId },
  });

  if (!promo) {
    throw createServiceError('Promotion campaign not found', HTTP_STATUS.NOT_FOUND, 'PROMOTION_NOT_FOUND');
  }

  return promo;
};

/**
 * Creates a new promotional flash campaign (with optional Cloudinary image upload)
 */
export const createPromotionService = async ({ promoData, file }) => {
  let backgroundImage = promoData.backgroundImage || null;

  if (file) {
    const uploaded = await uploadImageToCloudinary(file.buffer, 'dresses/promotions');
    backgroundImage = uploaded.url;
  }

  const promo = await prisma.promotionCampaign.create({
    data: {
      ...promoData,
      backgroundImage,
      startDate: new Date(promoData.startDate),
      endDate: new Date(promoData.endDate),
    },
  });

  return promo;
};

/**
 * Updates an existing promotional campaign
 */
export const updatePromotionService = async ({ promoId, promoData, file }) => {
  const existing = await prisma.promotionCampaign.findUnique({
    where: { id: promoId },
  });

  if (!existing) {
    throw createServiceError('Promotion campaign not found', HTTP_STATUS.NOT_FOUND, 'PROMOTION_NOT_FOUND');
  }

  const updateData = { ...promoData };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file.buffer, 'dresses/promotions');
    updateData.backgroundImage = uploaded.url;
  }
  if (promoData.startDate) updateData.startDate = new Date(promoData.startDate);
  if (promoData.endDate) updateData.endDate = new Date(promoData.endDate);

  const updated = await prisma.promotionCampaign.update({
    where: { id: promoId },
    data: updateData,
  });

  return updated;
};

/**
 * Toggles active status of promotion campaign
 */
export const togglePromotionStatusService = async ({ promoId, isActive }) => {
  const existing = await prisma.promotionCampaign.findUnique({
    where: { id: promoId },
  });

  if (!existing) {
    throw createServiceError('Promotion campaign not found', HTTP_STATUS.NOT_FOUND, 'PROMOTION_NOT_FOUND');
  }

  const updated = await prisma.promotionCampaign.update({
    where: { id: promoId },
    data: { isActive },
  });

  return updated;
};

/**
 * Deletes promotional campaign
 */
export const deletePromotionService = async (promoId) => {
  const existing = await prisma.promotionCampaign.findUnique({
    where: { id: promoId },
  });

  if (!existing) {
    throw createServiceError('Promotion campaign not found', HTTP_STATUS.NOT_FOUND, 'PROMOTION_NOT_FOUND');
  }

  await prisma.promotionCampaign.delete({
    where: { id: promoId },
  });

  return { message: `Promotion campaign '${existing.title}' deleted successfully` };
};
