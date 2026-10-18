import { z } from 'zod';

const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url('Image URL must be a valid URL').optional().nullable()
);

const coerceBoolean = (defaultVal) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      if (v.toLowerCase() === 'true') return true;
      if (v.toLowerCase() === 'false') return false;
    }
    return v;
  }, defaultVal !== undefined ? z.boolean().default(defaultVal) : z.boolean().optional());

const coerceProductIds = z.preprocess((v) => {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return [];
      }
    }
    if (trimmed.length > 0) {
      return trimmed.split(',').map((id) => id.trim()).filter(Boolean);
    }
    return [];
  }
  return v;
}, z.array(z.string().uuid('Invalid Product ID')).optional().default([]));

export const collectionParamIdSchema = z.object({
  id: z.string({ required_error: 'Collection ID is required' }).uuid('Invalid Collection ID format'),
});

export const createAdminCollectionSchema = z.object({
  name: z
    .string({ required_error: 'Collection name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(120, 'Name cannot exceed 120 characters'),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe (kebab-case)')
    .optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: optionalUrl,
  isFeatured: coerceBoolean(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: coerceBoolean(true),
  productIds: coerceProductIds,
});

export const updateAdminCollectionSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe (kebab-case)')
    .optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: optionalUrl,
  isFeatured: coerceBoolean(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: coerceBoolean(),
});

export const syncCollectionProductsSchema = z.object({
  productIds: z
    .array(z.string().uuid('Invalid Product ID'))
    .min(0, 'productIds must be an array'),
});

export const queryAdminCollectionSchema = z.object({
  search: z.string().trim().optional(),
  isFeatured: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
