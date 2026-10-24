import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

/**
 * Atomically recalculates average rating and review count for a product
 * based exclusively on APPROVED reviews.
 *
 * @param {string} productId
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx=prisma]
 */
export const recalculateProductReviewMetrics = async (productId, tx = prisma) => {
  const aggregate = await tx.review.aggregate({
    where: {
      productId,
      status: 'APPROVED',
    },
    _avg: { rating: true },
    _count: { id: true },
  });

  const rawRating = aggregate._avg.rating || 0;
  const rating = Math.round(rawRating * 10) / 10;
  const reviewCount = aggregate._count.id || 0;

  await tx.product.update({
    where: { id: productId },
    data: {
      rating,
      reviewCount,
    },
  });

  return { rating, reviewCount };
};

/**
 * Retrieves public approved reviews for a product with breakdown metrics and user voting status
 */
export const getProductReviewsService = async ({ slugOrId, query = {}, userId = null }) => {
  const {
    page = 1,
    limit = 10,
    rating,
    fitFeedback,
    hasImages,
    sortBy = 'newest',
  } = query;

  // Resolve product by ID or Slug
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      rating: true,
      reviewCount: true,
    },
  });

  if (!product) {
    throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  const whereClause = {
    productId: product.id,
    status: 'APPROVED',
  };

  if (rating !== undefined && rating !== null) {
    whereClause.rating = Number(rating);
  }

  if (fitFeedback) {
    whereClause.fitFeedback = fitFeedback;
  }

  if (hasImages === true || hasImages === 'true') {
    whereClause.images = { isEmpty: false };
  }

  // Determine sort order
  let orderBy = { createdAt: 'desc' };
  if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
  else if (sortBy === 'highest_rating') orderBy = { rating: 'desc' };
  else if (sortBy === 'lowest_rating') orderBy = { rating: 'asc' };
  else if (sortBy === 'most_helpful') orderBy = { helpfulCount: 'desc' };

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Parallel execution for paginated reviews, filtered count, and breakdown aggregates
  const [reviews, totalFiltered, allApprovedReviews] = await Promise.all([
    prisma.review.findMany({
      where: whereClause,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        votes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    }),
    prisma.review.count({ where: whereClause }),
    prisma.review.findMany({
      where: { productId: product.id, status: 'APPROVED' },
      select: { rating: true, fitFeedback: true },
    }),
  ]);

  // Compute 5-star to 1-star breakdown
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const fitDistribution = { RUNS_SMALL: 0, TRUE_TO_SIZE: 0, RUNS_LARGE: 0 };
  const totalApproved = allApprovedReviews.length;

  for (const r of allApprovedReviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    }
    if (r.fitFeedback && fitDistribution[r.fitFeedback] !== undefined) {
      fitDistribution[r.fitFeedback] += 1;
    }
  }

  const ratingBreakdown = {};
  for (let s = 5; s >= 1; s--) {
    const count = ratingDistribution[s] || 0;
    const percentage = totalApproved > 0 ? Math.round((count / totalApproved) * 100) : 0;
    ratingBreakdown[s] = { count, percentage };
  }

  // Format reviews list (map `hasVoted`)
  const formattedReviews = reviews.map((rev) => {
    const hasVoted = Boolean(rev.votes && rev.votes.length > 0);
    const { votes, ...rest } = rev;
    return {
      ...rest,
      hasVoted,
    };
  });

  return {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      rating: product.rating,
      reviewCount: product.reviewCount,
    },
    summary: {
      averageRating: product.rating,
      totalReviews: totalApproved,
      ratingBreakdown,
      fitBreakdown: fitDistribution,
    },
    reviews: formattedReviews,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalCount: totalFiltered,
      totalPages: Math.ceil(totalFiltered / Number(limit)) || 1,
      hasNextPage: Number(page) * Number(limit) < totalFiltered,
      hasPrevPage: Number(page) > 1,
    },
  };
};

/**
 * Creates a customer product review with automated verified purchase check
 */
export const createReviewService = async ({ productIdOrSlug, userId, reviewData }) => {
  // Resolve product
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }],
    },
  });

  if (!product) {
    throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  // Check if customer already submitted a review for this product
  const existingReview = await prisma.review.findUnique({
    where: {
      userId_productId: {
        userId,
        productId: product.id,
      },
    },
  });

  if (existingReview) {
    throw createServiceError(
      'You have already submitted a review for this product. You can update your existing review instead.',
      HTTP_STATUS.CONFLICT,
      'REVIEW_ALREADY_EXISTS'
    );
  }

  // Verify purchase: Check if user has an order with status DELIVERED containing this product
  const deliveredOrder = await prisma.orderItem.findFirst({
    where: {
      productId: product.id,
      order: {
        userId,
        status: 'DELIVERED',
      },
    },
    select: {
      orderId: true,
    },
  });

  const isVerifiedPurchase = Boolean(deliveredOrder);
  const orderId = deliveredOrder?.orderId || null;

  // Normalize images array
  let images = [];
  if (Array.isArray(reviewData.images)) {
    images = reviewData.images.filter(Boolean);
  } else if (typeof reviewData.images === 'string' && reviewData.images.trim().length > 0) {
    try {
      const parsed = JSON.parse(reviewData.images);
      images = Array.isArray(parsed) ? parsed : [reviewData.images];
    } catch {
      images = [reviewData.images];
    }
  }

  // Execute review creation and rating metric recalculation in an atomic transaction
  const newReview = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        productId: product.id,
        userId,
        orderId,
        rating: Number(reviewData.rating),
        title: reviewData.title ? reviewData.title.trim() : null,
        comment: reviewData.comment.trim(),
        fitFeedback: reviewData.fitFeedback || null,
        images,
        isVerifiedPurchase,
        status: 'APPROVED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    await recalculateProductReviewMetrics(product.id, tx);
    return created;
  });

  return newReview;
};

/**
 * Retrieves all reviews authored by the currently logged-in customer
 */
export const getCustomerReviewsService = async ({ userId, query = {} }) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [reviews, totalCount] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            regularPrice: true,
            salePrice: true,
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
              select: { url: true, altText: true },
            },
          },
        },
      },
    }),
    prisma.review.count({ where: { userId } }),
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
 * Retrieves products delivered to the customer that they have not reviewed yet
 */
export const getPendingReviewProductsService = async ({ userId }) => {
  // Find all delivered items for this customer
  const deliveredItems = await prisma.orderItem.findMany({
    where: {
      order: {
        userId,
        status: 'DELIVERED',
      },
    },
    select: {
      orderId: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          regularPrice: true,
          salePrice: true,
          images: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true, altText: true },
          },
        },
      },
    },
  });

  // Get all product IDs this user has already reviewed
  const reviewedProducts = await prisma.review.findMany({
    where: { userId },
    select: { productId: true },
  });
  const reviewedSet = new Set(reviewedProducts.map((r) => r.productId));

  // Deduplicate products pending review
  const pendingMap = new Map();
  for (const item of deliveredItems) {
    if (item.product && !reviewedSet.has(item.productId) && !pendingMap.has(item.productId)) {
      pendingMap.set(item.productId, {
        ...item.product,
        orderId: item.orderId,
      });
    }
  }

  return Array.from(pendingMap.values());
};

/**
 * Updates a review authored by the customer
 */
export const updateReviewService = async ({ reviewId, userId, updateData }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  if (review.userId !== userId) {
    throw createServiceError(
      'You are not authorized to update this review',
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN'
    );
  }

  const dataToUpdate = {};
  if (updateData.rating !== undefined) dataToUpdate.rating = Number(updateData.rating);
  if (updateData.title !== undefined) dataToUpdate.title = updateData.title ? updateData.title.trim() : null;
  if (updateData.comment !== undefined) dataToUpdate.comment = updateData.comment.trim();
  if (updateData.fitFeedback !== undefined) dataToUpdate.fitFeedback = updateData.fitFeedback;
  if (updateData.images !== undefined) {
    if (Array.isArray(updateData.images)) {
      dataToUpdate.images = updateData.images.filter(Boolean);
    } else if (typeof updateData.images === 'string') {
      try {
        const parsed = JSON.parse(updateData.images);
        dataToUpdate.images = Array.isArray(parsed) ? parsed : [updateData.images];
      } catch {
        dataToUpdate.images = [updateData.images];
      }
    }
  }

  const updatedReview = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: dataToUpdate,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (updateData.rating !== undefined && updateData.rating !== review.rating) {
      await recalculateProductReviewMetrics(review.productId, tx);
    }

    return updated;
  });

  return updatedReview;
};

/**
 * Deletes a customer's review
 */
export const deleteReviewService = async ({ reviewId, userId }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  if (review.userId !== userId) {
    throw createServiceError(
      'You are not authorized to delete this review',
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN'
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({
      where: { id: reviewId },
    });
    await recalculateProductReviewMetrics(review.productId, tx);
  });

  return { id: reviewId, deleted: true };
};

/**
 * Toggles a customer's "Was this helpful?" vote on a review
 */
export const toggleReviewVoteService = async ({ reviewId, userId }) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw createServiceError('Review not found', HTTP_STATUS.NOT_FOUND, 'REVIEW_NOT_FOUND');
  }

  if (review.userId === userId) {
    throw createServiceError(
      'You cannot vote on your own review',
      HTTP_STATUS.BAD_REQUEST,
      'SELF_VOTE_NOT_ALLOWED'
    );
  }

  const existingVote = await prisma.reviewVote.findUnique({
    where: {
      reviewId_userId: {
        reviewId,
        userId,
      },
    },
  });

  let hasVoted = false;
  let helpfulCount = review.helpfulCount;

  if (existingVote) {
    // Un-vote
    await prisma.$transaction([
      prisma.reviewVote.delete({
        where: { id: existingVote.id },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: {
          helpfulCount: { decrement: 1 },
        },
      }),
    ]);
    hasVoted = false;
    helpfulCount = Math.max(0, helpfulCount - 1);
  } else {
    // Upvote
    await prisma.$transaction([
      prisma.reviewVote.create({
        data: {
          reviewId,
          userId,
        },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: {
          helpfulCount: { increment: 1 },
        },
      }),
    ]);
    hasVoted = true;
    helpfulCount = helpfulCount + 1;
  }

  return { reviewId, hasVoted, helpfulCount };
};
