import { z } from 'zod';

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
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  parentId: z.string().uuid('Invalid Parent Category ID').optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
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
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  parentId: z.string().uuid('Invalid Parent Category ID').optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
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
