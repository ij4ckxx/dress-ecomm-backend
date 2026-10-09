import { z } from 'zod';

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
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().uuid('Invalid Product ID')).optional().default([]),
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
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
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
