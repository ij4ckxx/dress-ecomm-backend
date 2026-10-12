import { z } from 'zod';

export const addToWishlistSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .uuid('Invalid Product ID format'),
});

export const wishlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  sort: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'])
    .default('newest'),
  inStock: z.enum(['all', 'true', 'false']).default('all'),
});

export const wishlistProductParamSchema = z.object({
  productId: z.string().uuid('Invalid Product ID format'),
});

export const wishlistAddToCartSchema = z.object({
  variantId: z.string().uuid('Invalid Variant ID format').optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  moveToCart: z.boolean().default(false),
});
