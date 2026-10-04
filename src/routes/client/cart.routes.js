import { Router } from 'express';
import { optionalAuthenticate, authenticate } from '../../middlewares/auth.middleware.js';
import { validate, validateParams } from '../../middlewares/validate.js';
import {
  addCartItemSchema,
  updateCartItemSchema,
  mergeCartSchema,
  createMetafieldSchema,
  updateMetafieldSchema,
  cartItemIdParamsSchema,
  metafieldParamsSchema,
  itemMetafieldParamsSchema,
} from '../../validators/cart.validator.js';
import {
  getCart,
  createCart,
  addItem,
  updateItem,
  removeItem,
  clearCartItems,
  mergeCart,
  listCartMetafields,
  createCartMetafield,
  updateCartMetafieldHandler,
  deleteCartMetafieldHandler,
  listCartItemMetafields,
  createCartItemMetafield,
  updateCartItemMetafieldHandler,
  deleteCartItemMetafieldHandler,
} from '../../controllers/client/cart.controller.js';

const router = Router();

// ==========================================
// 1. Cart Merge (Customer only)
// ==========================================
router.post('/merge', authenticate, validate(mergeCartSchema), mergeCart);

// ==========================================
// 2. Cart Items
// ==========================================
// Add item to cart
router.post('/items', optionalAuthenticate, validate(addCartItemSchema), addItem);

// Clear all items from cart
router.delete('/items', optionalAuthenticate, clearCartItems);

// Update specific item in cart
router.patch(
  '/items/:itemId',
  optionalAuthenticate,
  validateParams(cartItemIdParamsSchema),
  validate(updateCartItemSchema),
  updateItem
);

// Remove specific item from cart
router.delete(
  '/items/:itemId',
  optionalAuthenticate,
  validateParams(cartItemIdParamsSchema),
  removeItem
);

// ==========================================
// 3. Cart Item Metafields
// ==========================================
router.get(
  '/items/:itemId/metafields',
  optionalAuthenticate,
  validateParams(cartItemIdParamsSchema),
  listCartItemMetafields
);

router.post(
  '/items/:itemId/metafields',
  optionalAuthenticate,
  validateParams(cartItemIdParamsSchema),
  validate(createMetafieldSchema),
  createCartItemMetafield
);

router.patch(
  '/items/:itemId/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(itemMetafieldParamsSchema),
  validate(updateMetafieldSchema),
  updateCartItemMetafieldHandler
);

router.delete(
  '/items/:itemId/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(itemMetafieldParamsSchema),
  deleteCartItemMetafieldHandler
);

// ==========================================
// 4. Cart Metafields
// ==========================================
router.get('/metafields', optionalAuthenticate, listCartMetafields);

router.post(
  '/metafields',
  optionalAuthenticate,
  validate(createMetafieldSchema),
  createCartMetafield
);

router.patch(
  '/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(metafieldParamsSchema),
  validate(updateMetafieldSchema),
  updateCartMetafieldHandler
);

router.delete(
  '/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(metafieldParamsSchema),
  deleteCartMetafieldHandler
);

// ==========================================
// 5. Parameterized Routes (:cartId support)
// Supports explicit REST /carts/:cartId paths
// ==========================================
router.get('/:cartId/metafields', optionalAuthenticate, listCartMetafields);
router.post(
  '/:cartId/metafields',
  optionalAuthenticate,
  validate(createMetafieldSchema),
  createCartMetafield
);
router.patch(
  '/:cartId/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(metafieldParamsSchema),
  validate(updateMetafieldSchema),
  updateCartMetafieldHandler
);
router.delete(
  '/:cartId/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(metafieldParamsSchema),
  deleteCartMetafieldHandler
);

router.get(
  '/:cartId/items/:itemId/metafields',
  optionalAuthenticate,
  validateParams(itemMetafieldParamsSchema),
  listCartItemMetafields
);
router.post(
  '/:cartId/items/:itemId/metafields',
  optionalAuthenticate,
  validateParams(cartItemIdParamsSchema),
  validate(createMetafieldSchema),
  createCartItemMetafield
);
router.patch(
  '/:cartId/items/:itemId/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(itemMetafieldParamsSchema),
  validate(updateMetafieldSchema),
  updateCartItemMetafieldHandler
);
router.delete(
  '/:cartId/items/:itemId/metafields/:metafieldId',
  optionalAuthenticate,
  validateParams(itemMetafieldParamsSchema),
  deleteCartItemMetafieldHandler
);

router.post(
  '/:cartId/items',
  optionalAuthenticate,
  validate(addCartItemSchema),
  addItem
);
router.delete('/:cartId/items', optionalAuthenticate, clearCartItems);
router.patch(
  '/:cartId/items/:itemId',
  optionalAuthenticate,
  validateParams(cartItemIdParamsSchema),
  validate(updateCartItemSchema),
  updateItem
);
router.delete(
  '/:cartId/items/:itemId',
  optionalAuthenticate,
  validateParams(cartItemIdParamsSchema),
  removeItem
);

// ==========================================
// 6. Base Cart Operations
// ==========================================
router.get('/:cartId', optionalAuthenticate, getCart);
router.delete('/:cartId', optionalAuthenticate, clearCartItems);
router.get('/', optionalAuthenticate, getCart);
router.post('/', optionalAuthenticate, createCart);
router.delete('/', optionalAuthenticate, clearCartItems);

export default router;
