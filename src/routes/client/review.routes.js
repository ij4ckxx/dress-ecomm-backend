import { Router } from 'express';
import {
  getProductReviews,
  createReview,
  getCustomerReviews,
  getPendingReviewProducts,
  updateReview,
  deleteReview,
  toggleReviewVote,
} from '../../controllers/client/review.controller.js';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { uploadMultipleImages } from '../../middlewares/upload.middleware.js';
import { validateImageExclusivity, parseFormDataJsonFields } from '../../middlewares/imageExclusivity.js';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
  reviewIdParamSchema,
  productIdParamSchema,
  productSlugOrIdParamSchema,
} from '../../validators/client/review.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/reviews/products/:slugOrId
 * @desc    Get paginated approved reviews and rating breakdown for a product
 * @access  Public (Optional Customer Token for user vote status)
 */
router.get(
  '/products/:slugOrId',
  optionalAuthenticate,
  validateParams(productSlugOrIdParamSchema),
  validateQuery(reviewQuerySchema),
  getProductReviews
);

/**
 * @route   POST /api/v1/reviews/products/:id
 * @desc    Submit a review for a product (supports image file uploads OR image URLs array)
 * @access  Private (Authenticated Customer)
 */
router.post(
  '/products/:id',
  authenticate,
  uploadMultipleImages,
  parseFormDataJsonFields(['images']),
  validateImageExclusivity({ fileFields: ['images', 'files', 'image', 'file'], urlField: 'images', isMultiple: true }),
  validateParams(productIdParamSchema),
  validate(createReviewSchema),
  createReview
);

/**
 * @route   GET /api/v1/reviews/my-reviews
 * @desc    Get all reviews authored by the authenticated customer
 * @access  Private (Authenticated Customer)
 */
router.get('/my-reviews', authenticate, getCustomerReviews);

/**
 * @route   GET /api/v1/reviews/pending
 * @desc    Get products purchased by customer that have not yet been reviewed
 * @access  Private (Authenticated Customer)
 */
router.get('/pending', authenticate, getPendingReviewProducts);

/**
 * @route   PUT /api/v1/reviews/:id
 * @route   PATCH /api/v1/reviews/:id
 * @desc    Update customer's own review
 * @access  Private (Authenticated Customer)
 */
router.put(
  '/:id',
  authenticate,
  uploadMultipleImages,
  parseFormDataJsonFields(['images']),
  validateImageExclusivity({ fileFields: ['images', 'files', 'image', 'file'], urlField: 'images', isMultiple: true }),
  validateParams(reviewIdParamSchema),
  validate(updateReviewSchema),
  updateReview
);
router.patch(
  '/:id',
  authenticate,
  uploadMultipleImages,
  parseFormDataJsonFields(['images']),
  validateImageExclusivity({ fileFields: ['images', 'files', 'image', 'file'], urlField: 'images', isMultiple: true }),
  validateParams(reviewIdParamSchema),
  validate(updateReviewSchema),
  updateReview
);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete customer's own review
 * @access  Private (Authenticated Customer)
 */
router.delete('/:id', authenticate, validateParams(reviewIdParamSchema), deleteReview);

/**
 * @route   POST /api/v1/reviews/:id/vote
 * @desc    Toggle helpful vote on a review
 * @access  Private (Authenticated Customer)
 */
router.post('/:id/vote', authenticate, validateParams(reviewIdParamSchema), toggleReviewVote);

export default router;
