import { z } from 'zod';

export const productParamIdSchema = z.object({
  id: z.string({ required_error: 'Product ID is required' }).uuid('Invalid Product ID format'),
});

export const productImageParamSchema = z.object({
  id: z.string().uuid('Invalid Product ID'),
  imageId: z.string().uuid('Invalid Image ID'),
});

const coerceBoolean = (defaultVal) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      if (v.toLowerCase() === 'true') return true;
      if (v.toLowerCase() === 'false') return false;
    }
    return v;
  }, defaultVal !== undefined ? z.boolean().default(defaultVal) : z.boolean().optional());

const variantInputSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(2, 'Variant SKU must be at least 2 chars').max(80),
  name: z.string().trim().max(100).optional().nullable(),
  regularPrice: z.coerce.number().min(0).optional().nullable(),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  offerPrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  size: z.string().trim().max(50).optional().nullable(),
  color: z.string().trim().max(50).optional().nullable(),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color hex must be a valid hex code (e.g. #046307)')
    .optional()
    .nullable(),
  isActive: coerceBoolean(true),
});

const imageInputSchema = z.object({
  url: z.string().url('Image URL must be valid'),
  altText: z.string().trim().max(200).optional().nullable(),
  isThumbnail: coerceBoolean(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  variantSku: z.string().trim().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
});

const coerceImagesArray = z.preprocess((v) => {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => (typeof item === 'string' ? { url: item } : item));
        }
      } catch {
        return [];
      }
    }
    if (trimmed.length > 0) {
      return [{ url: trimmed }];
    }
    return [];
  }
  if (Array.isArray(v)) {
    return v.map((item) => (typeof item === 'string' ? { url: item } : item));
  }
  return v;
}, z.array(imageInputSchema).optional().default([]));

const coerceVariantsArray = z.preprocess((v) => {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return [];
      }
    }
    return [];
  }
  return v;
}, z.array(variantInputSchema).optional().default([]));

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
  isActive: coerceBoolean(true),
  isFeatured: coerceBoolean(false),
  images: coerceImagesArray,
  variants: coerceVariantsArray,
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
  isActive: coerceBoolean(),
  isFeatured: coerceBoolean(),
  images: coerceImagesArray,
  variants: coerceVariantsArray,
});

export const uploadProductImageBodySchema = z.object({
  url: z.string().url('Image URL must be a valid URL').optional(),
  altText: z.string().trim().max(200).optional().nullable(),
  isThumbnail: coerceBoolean(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  variantId: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().uuid('Invalid variant ID').optional().nullable()),
});

export const toggleProductStatusSchema = z.object({
  isActive: coerceBoolean(),
  isFeatured: coerceBoolean(),
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
  sortBy: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'rating_desc']).default('newest'),
});
