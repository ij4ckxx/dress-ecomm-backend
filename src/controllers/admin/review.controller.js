import { sendSuccess } from '../../utils/apiResponse.js';
import {
  getAdminReviewsService,
  getAdminReviewByIdService,
  updateReviewStatusService,
  adminReplyToReviewService,
  deleteAdminReplyService,
  deleteAdminReviewService,
  getAdminReviewAnalyticsService,
} from '../../services/admin/review.service.js';

/**
 * Get paginated list of all reviews with search and multi-facet filtering
 * GET /api/v1/admin/reviews
 */
export const getAdminReviews = async (req, res, next) => {
  try {
    const result = await getAdminReviewsService({ query: req.query });

    return sendSuccess(res, {
      message: 'Admin reviews fetched successfully',
      data: result.reviews,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comprehensive single review detail
 * GET /api/v1/admin/reviews/:id
 */
export const getAdminReviewById = async (req, res, next) => {
  try {
    const review = await getAdminReviewByIdService(req.params.id);

    return sendSuccess(res, {
      message: 'Review details fetched successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update moderation status (APPROVED, REJECTED, FLAGGED, PENDING)
 * PATCH /api/v1/admin/reviews/:id/status
 */
export const updateReviewStatus = async (req, res, next) => {
  try {
    const updatedReview = await updateReviewStatusService({
      reviewId: req.params.id,
      status: req.body.status,
      adminUserId: req.user.id,
      req,
    });

    return sendSuccess(res, {
      message: `Review status updated to ${req.body.status} successfully`,
      data: { review: updatedReview },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or update official merchant reply
 * POST /api/v1/admin/reviews/:id/reply
 */
export const adminReplyToReview = async (req, res, next) => {
  try {
    const updatedReview = await adminReplyToReviewService({
      reviewId: req.params.id,
      reply: req.body.reply,
      adminUserId: req.user.id,
      req,
    });

    return sendSuccess(res, {
      message: 'Merchant reply published successfully',
      data: { review: updatedReview },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove official merchant reply
 * DELETE /api/v1/admin/reviews/:id/reply
 */
export const deleteAdminReply = async (req, res, next) => {
  try {
    const updatedReview = await deleteAdminReplyService({
      reviewId: req.params.id,
      adminUserId: req.user.id,
      req,
    });

    return sendSuccess(res, {
      message: 'Merchant reply removed successfully',
      data: { review: updatedReview },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review permanently
 * DELETE /api/v1/admin/reviews/:id
 */
export const deleteAdminReview = async (req, res, next) => {
  try {
    const result = await deleteAdminReviewService({
      reviewId: req.params.id,
      adminUserId: req.user.id,
      req,
    });

    return sendSuccess(res, {
      message: 'Review permanently deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review analytics & metrics overview
 * GET /api/v1/admin/reviews/analytics
 */
export const getAdminReviewAnalytics = async (req, res, next) => {
  try {
    const analytics = await getAdminReviewAnalyticsService();

    return sendSuccess(res, {
      message: 'Review analytics fetched successfully',
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};
