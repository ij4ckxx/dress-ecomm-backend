import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';
import {
  getProductReviewsService,
  createReviewService,
  getCustomerReviewsService,
  getPendingReviewProductsService,
  updateReviewService,
  deleteReviewService,
  toggleReviewVoteService,
} from '../../services/client/review.service.js';

/**
 * Public: Get reviews for a product by slug or id
 * GET /api/v1/products/:slug/reviews or GET /api/v1/reviews/products/:slugOrId
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const slugOrId = req.params.slug || req.params.slugOrId || req.params.id;
    const userId = req.user?.id || null;

    const data = await getProductReviewsService({
      slugOrId,
      query: req.query,
      userId,
    });

    return sendSuccess(res, {
      message: 'Product reviews fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated Customer: Submit a review for a product
 * Supports direct file uploads (streamed to Cloudinary) OR image URLs array
 * POST /api/v1/products/:id/reviews or POST /api/v1/reviews/products/:id
 */
export const createReview = async (req, res, next) => {
  try {
    const productIdOrSlug = req.params.id || req.params.slugOrId || req.body.productId;
    const payload = { ...req.body };

    // Process file uploads to Cloudinary if provided
    const hasFiles = Boolean(
      (req.files && Array.isArray(req.files) && req.files.length > 0) ||
      (req.file)
    );

    if (hasFiles) {
      payload.images = [];
      const fileList = Array.isArray(req.files) ? req.files : [req.file];
      for (const file of fileList) {
        if (file && file.buffer) {
          const uploaded = await uploadImageToCloudinary(file.buffer, 'dresses/reviews');
          payload.images.push(uploaded.url);
        }
      }
    }

    const review = await createReviewService({
      productIdOrSlug,
      userId: req.user.id,
      reviewData: payload,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Review submitted successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated Customer: List my own submitted reviews
 * GET /api/v1/reviews/my-reviews or GET /api/v1/customer/reviews
 */
export const getCustomerReviews = async (req, res, next) => {
  try {
    const result = await getCustomerReviewsService({
      userId: req.user.id,
      query: req.query,
    });

    return sendSuccess(res, {
      message: 'Customer reviews fetched successfully',
      data: result.reviews,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated Customer: List delivered products awaiting customer review
 * GET /api/v1/reviews/pending-products or GET /api/v1/customer/reviews/pending
 */
export const getPendingReviewProducts = async (req, res, next) => {
  try {
    const pendingProducts = await getPendingReviewProductsService({
      userId: req.user.id,
    });

    return sendSuccess(res, {
      message: 'Pending review products fetched successfully',
      data: { products: pendingProducts },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated Customer: Update my existing review
 * Supports direct file uploads (streamed to Cloudinary) OR image URLs array
 * PUT /api/v1/reviews/:id or PATCH /api/v1/reviews/:id
 */
export const updateReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const payload = { ...req.body };

    const hasFiles = Boolean(
      (req.files && Array.isArray(req.files) && req.files.length > 0) ||
      (req.file)
    );

    if (hasFiles) {
      payload.images = [];
      const fileList = Array.isArray(req.files) ? req.files : [req.file];
      for (const file of fileList) {
        if (file && file.buffer) {
          const uploaded = await uploadImageToCloudinary(file.buffer, 'dresses/reviews');
          payload.images.push(uploaded.url);
        }
      }
    }

    const updatedReview = await updateReviewService({
      reviewId,
      userId: req.user.id,
      updateData: payload,
    });

    return sendSuccess(res, {
      message: 'Review updated successfully',
      data: { review: updatedReview },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated Customer: Delete my existing review
 * DELETE /api/v1/reviews/:id
 */
export const deleteReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const result = await deleteReviewService({
      reviewId,
      userId: req.user.id,
    });

    return sendSuccess(res, {
      message: 'Review deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated Customer: Toggle "Was this helpful?" vote
 * POST /api/v1/reviews/:id/vote
 */
export const toggleReviewVote = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const voteResult = await toggleReviewVoteService({
      reviewId,
      userId: req.user.id,
    });

    return sendSuccess(res, {
      message: voteResult.hasVoted
        ? 'Thank you for your feedback! Review marked as helpful.'
        : 'Helpful vote removed.',
      data: voteResult,
    });
  } catch (error) {
    next(error);
  }
};
