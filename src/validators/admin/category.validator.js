import { z } from 'zod';

const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url('Image URL must be a valid URL').optional().nullable()
);

const optionalUuid = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().uuid('Invalid Parent Category ID').optional().nullable()
);

const coerceBoolean = (defaultVal) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      if (v.toLowerCase() === 'true') return true;
      if (v.toLowerCase() === 'false') return false;
    }
    return v;
  }, defaultVal !== undefined ? z.boolean().default(defaultVal) : z.boolean().optional());

export const categoryParamIdSchema = z.object({
  id: z.string({ required_error: 'Category ID is required' }).uuid('Invalid Category ID format'),
});

export const createAdminCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe (kebab-case)')
    .optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: optionalUrl,
  parentId: optionalUuid,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isFeatured: coerceBoolean(false),
  isActive: coerceBoolean(true),
});

export const updateAdminCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe (kebab-case)')
    .optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: optionalUrl,
  parentId: optionalUuid,
  sortOrder: z.coerce.number().int().min(0).optional(),
  isFeatured: coerceBoolean(),
  isActive: coerceBoolean(),
});

export const queryAdminCategorySchema = z.object({
  view: z.enum(['tree', 'flat', 'root']).default('tree'),
  search: z.string().trim().optional(),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isFeatured: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
