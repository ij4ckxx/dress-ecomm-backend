import { Router } from 'express';
import {
  listProducts,
  getProductDetails,
} from '../../controllers/client/product.controller.js';
import {
  getProductReviews,
  createReview,
} from '../../controllers/client/review.controller.js';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../../middlewares/validate.js';
import { uploadMultipleImages } from '../../middlewares/upload.middleware.js';
import { validateImageExclusivity, parseFormDataJsonFields } from '../../middlewares/imageExclusivity.js';
import {
  productQuerySchema,
  productSlugParamsSchema,
} from '../../validators/product.validator.js';
import {
  createReviewSchema,
  reviewQuerySchema,
  productIdParamSchema,
} from '../../validators/client/review.validator.js';

const router = Router();

// Reusable product discovery API (search, filter, dynamic attributes, sort, pagination)
router.get('/', optionalAuthenticate, validateQuery(productQuerySchema), listProducts);

// Complete product details API
router.get('/:slug', optionalAuthenticate, validateParams(productSlugParamsSchema), getProductDetails);

// Product reviews discovery & summary
router.get(
  '/:slug/reviews',
  optionalAuthenticate,
  validateParams(productSlugParamsSchema),
  validateQuery(reviewQuerySchema),
  getProductReviews
);

// Submit customer review for product
router.post(
  '/:id/reviews',
  authenticate,
  uploadMultipleImages,
  parseFormDataJsonFields(['images']),
  validateImageExclusivity({ fileFields: ['images', 'files', 'image', 'file'], urlField: 'images', isMultiple: true }),
  validateParams(productIdParamSchema),
  validate(createReviewSchema),
  createReview
);

export default router;
