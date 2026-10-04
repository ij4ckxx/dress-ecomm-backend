import { z } from 'zod';
import { ALLOWED_SORT_VALUES } from '../constants/sortOptions.js';

const booleanString = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
    return undefined;
  });

export const productQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  minPrice: z.union([z.string(), z.number()]).optional(),
  maxPrice: z.union([z.string(), z.number()]).optional(),
  sort: z.enum(ALLOWED_SORT_VALUES).optional(),
  isFeatured: booleanString,
}).passthrough();

export const productSlugParamsSchema = z.object({
  slug: z.string().trim().min(1, 'Product slug is required'),
});
