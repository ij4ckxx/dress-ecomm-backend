import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { logAdminAction } from '../../utils/auditLogger.js';
import { recalculateProductReviewMetrics } from '../client/review.service.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

/**
 * Retrieves paginated store reviews with rich filtering and search for admin management
 */
export const getAdminReviewsService = async ({ query = {} }) => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    rating,
    productId,
    isVerifiedPurchase,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }

  if (rating !== undefined && rating !== null) {
    whereClause.rating = Number(rating);
  }

  if (productId) {
    whereClause.productId = productId;
  }

  if (isVerifiedPurchase !== undefined && isVerifiedPurchase !== null) {
    whereClause.isVerifiedPurchase = isVerifiedPurchase === true || isVerifiedPurchase === 'true';
  }

  // Date range filtering
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = new Date(startDate);
    if (endDate) whereClause.createdAt.lte = new Date(endDate);
  }

  // Multi-field search
  if (search && search.trim().length > 0) {
    const term = search.trim();
    whereClause.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { comment: { contains: term, mode: 'insensitive' } },
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { product: { name: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  const orderBy = { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' };

  const [reviews, totalCount] = await Promise.all([
    prisma.review.findMany({
      where: whereClause,
      skip,
      take,
      orderBy,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            rating: true,
            reviewCount: true,
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
              select: { url: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        repliedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.review.count({ where: whereClause }),
  ]);

  return {
    reviews,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
      hasNextPage: Number(page) * Number(limit) < totalCount,
      hasPrevPage: Number(page) > 1,
    },
  };
};

/**
 * Retrieves complete single review detail for admin inspection
 */
export const getAdminReviewByIdService = async (reviewId) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          regularPrice: true,
          salePrice: true,
          rating: true,
          reviewCount: true,
          images: {
            take: 3,
            orderBy: { sortOrder: 'asc' },
            select: { url: true, altText: true },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: { orders: true, reviews: true },
          },
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          deliveredAt: true,
        },
      },
      repliedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  return review;
};

/**
 * Updates review moderation status (APPROVED, REJECTED, FLAGGED, PENDING)
 */
export const updateReviewStatusService = async ({ reviewId, status, adminUserId, req }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  const previousStatus = review.status;

  const updatedReview = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: { status },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Recompute product rating & count if status transitioned to/from APPROVED
    if (previousStatus === 'APPROVED' || status === 'APPROVED') {
      await recalculateProductReviewMetrics(review.productId, tx);
    }

    return updated;
  });

  // Non-blocking audit logging
  logAdminAction({
    userId: adminUserId,
    action: 'UPDATE_REVIEW_STATUS',
    entity: 'REVIEW',
    entityId: reviewId,
    details: {
      productId: review.productId,
      previousStatus,
      newStatus: status,
    },
    req,
  });

  return updatedReview;
};

/**
 * Adds or updates an official merchant/admin reply to a customer review
 */
export const adminReplyToReviewService = async ({ reviewId, reply, adminUserId, req }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      adminReply: reply.trim(),
      adminReplyAt: new Date(),
      repliedById: adminUserId,
    },
    include: {
      repliedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  logAdminAction({
    userId: adminUserId,
    action: 'REPLY_TO_REVIEW',
    entity: 'REVIEW',
    entityId: reviewId,
    details: {
      productId: review.productId,
      replyLength: reply.trim().length,
    },
    req,
  });

  return updated;
};

/**
 * Removes an official merchant reply from a review
 */
export const deleteAdminReplyService = async ({ reviewId, adminUserId, req }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      adminReply: null,
      adminReplyAt: null,
      repliedById: null,
    },
  });

  logAdminAction({
    userId: adminUserId,
    action: 'DELETE_REVIEW_REPLY',
    entity: 'REVIEW',
    entityId: reviewId,
    details: { productId: review.productId },
    req,
  });

  return updated;
};

/**
 * Permanently deletes a review (e.g., spam or abusive)
 */
export const deleteAdminReviewService = async ({ reviewId, adminUserId, req }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({
      where: { id: reviewId },
    });
    await recalculateProductReviewMetrics(review.productId, tx);
  });

  logAdminAction({
    userId: adminUserId,
    action: 'DELETE_REVIEW',
    entity: 'REVIEW',
    entityId: reviewId,
    details: {
      productId: review.productId,
      reviewAuthorId: review.userId,
      rating: review.rating,
    },
    req,
  });

  return { id: reviewId, deleted: true };
};

/**
 * Generates storewide review analytics and moderation telemetry
 */
export const getAdminReviewAnalyticsService = async () => {
  const [
    totalReviews,
    pendingReviews,
    approvedReviews,
    rejectedReviews,
    flaggedReviews,
    verifiedPurchases,
    approvedAggregate,
    allApproved,
  ] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.review.count({ where: { status: 'APPROVED' } }),
    prisma.review.count({ where: { status: 'REJECTED' } }),
    prisma.review.count({ where: { status: 'FLAGGED' } }),
    prisma.review.count({ where: { isVerifiedPurchase: true } }),
    prisma.review.aggregate({
      where: { status: 'APPROVED' },
      _avg: { rating: true },
    }),
    prisma.review.findMany({
      where: { status: 'APPROVED' },
      select: { rating: true, fitFeedback: true, productId: true },
    }),
  ]);

  // Rating distribution
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const fitCounts = { RUNS_SMALL: 0, TRUE_TO_SIZE: 0, RUNS_LARGE: 0 };

  for (const r of allApproved) {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    }
    if (r.fitFeedback && fitCounts[r.fitFeedback] !== undefined) {
      fitCounts[r.fitFeedback] += 1;
    }
  }

  const averageStoreRating = approvedAggregate._avg.rating
    ? Math.round(approvedAggregate._avg.rating * 10) / 10
    : 0;

  // Top reviewed products
  const topReviewedProducts = await prisma.product.findMany({
    where: { reviewCount: { gt: 0 } },
    take: 5,
    orderBy: { reviewCount: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      rating: true,
      reviewCount: true,
    },
  });

  return {
    overview: {
      totalReviews,
      approvedReviews,
      pendingReviews,
      rejectedReviews,
      flaggedReviews,
      verifiedPurchases,
      verifiedPurchasePercentage:
        totalReviews > 0 ? Math.round((verifiedPurchases / totalReviews) * 100) : 0,
      averageStoreRating,
    },
    ratingDistribution: ratingCounts,
    fitDistribution: fitCounts,
    topReviewedProducts,
  };
};
