import { Router } from 'express';
import {
  listCategories,
  getCategoryDetails,
  getCategoryProductList,
  getCategoryFilterOptions,
} from '../../controllers/client/category.controller.js';
import { optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { validateQuery, validateParams } from '../../middlewares/validate.js';
import {
  categoryListQuerySchema,
  categorySlugParamsSchema,
  categoryProductsQuerySchema,
} from '../../validators/category.validator.js';

const router = Router();

// List categories (tree hierarchy, root-only, or flat)
router.get('/', optionalAuthenticate, validateQuery(categoryListQuerySchema), listCategories);

// Get single category details
router.get('/:slug', optionalAuthenticate, validateParams(categorySlugParamsSchema), getCategoryDetails);

// Get lightweight products for a category page (PLP)
router.get(
  '/:slug/products',
  optionalAuthenticate,
  validateParams(categorySlugParamsSchema),
  validateQuery(categoryProductsQuerySchema),
  getCategoryProductList
);

// Get available dynamic filter options for a category (PLP sidebar)
router.get(
  '/:slug/filters',
  optionalAuthenticate,
  validateParams(categorySlugParamsSchema),
  getCategoryFilterOptions
);

export default router;
