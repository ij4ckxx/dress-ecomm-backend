import { Router } from 'express';
import {
  listProducts,
  getProductDetails,
} from '../../controllers/client/product.controller.js';
import { optionalAuthenticate } from '../../middlewares/auth.middleware.js';
import { validateQuery, validateParams } from '../../middlewares/validate.js';
import {
  productQuerySchema,
  productSlugParamsSchema,
} from '../../validators/product.validator.js';

const router = Router();

// Reusable product discovery API (search, filter, dynamic attributes, sort, pagination)
router.get('/', optionalAuthenticate, validateQuery(productQuerySchema), listProducts);

// Complete product details API
router.get('/:slug', optionalAuthenticate, validateParams(productSlugParamsSchema), getProductDetails);

export default router;
