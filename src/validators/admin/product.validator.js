import { z } from 'zod';

export const productParamIdSchema = z.object({
  id: z.string({ required_error: 'Product ID is required' }).uuid('Invalid Product ID format'),
});

export const productImageParamSchema = z.object({
  id: z.string().uuid('Invalid Product ID'),
  imageId: z.string().uuid('Invalid Image ID'),
});

const variantInputSchema = z.object({
  id: z.string().uuid().optional(), // Provided when updating existing variant
  sku: z.string().trim().min(2, 'Variant SKU must be at least 2 chars').max(80),
  name: z.string().trim().max(100).optional().nullable(),
  regularPrice: z.coerce.number().min(0).optional().nullable(),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  offerPrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  size: z.string().trim().max(50).optional().nullable(), // e.g. "S", "M", "L", "Free Size"
  color: z.string().trim().max(50).optional().nullable(), // e.g. "Emerald Green"
  colorHex: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hex must be a valid hex code (e.g. #046307)')
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});

const imageInputSchema = z.object({
  url: z.string().url('Image URL must be valid'),
  altText: z.string().trim().max(200).optional().nullable(),
  isThumbnail: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  variantSku: z.string().trim().optional().nullable(),
});

export const createAdminProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(200, 'Name cannot exceed 200 characters'),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case')
    .optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  brand: z.string().trim().max(100).default('Maison De Élégance'),
  sku: z.string().trim().max(80).optional(),
  categoryId: z.string({ required_error: 'Category is required' }).uuid('Invalid Category ID format'),
  regularPrice: z.coerce.number({ required_error: 'Regular price is required' }).min(0, 'Price must be >= 0'),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  offerPrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(imageInputSchema).optional().default([]),
  variants: z.array(variantInputSchema).optional().default([]),
});

export const updateAdminProductSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case')
    .optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  brand: z.string().trim().max(100).optional(),
  sku: z.string().trim().max(80).optional(),
  categoryId: z.string().uuid().optional(),
  regularPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  offerPrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(imageInputSchema).optional(),
  variants: z.array(variantInputSchema).optional(),
});

export const toggleProductStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const queryAdminProductSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isFeatured: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z
    .enum([
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'stock_asc',
      'stock_desc',
      'name_asc',
      'bestselling',
    ])
    .default('newest'),
});
