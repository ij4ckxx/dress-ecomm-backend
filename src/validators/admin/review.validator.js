import { z } from 'zod';

export const adminReviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  productId: z.string().optional(),
  isVerifiedPurchase: z.coerce.boolean().optional(),
  startDate: z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
  endDate: z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
  sortBy: z.enum(['createdAt', 'rating', 'helpfulCount', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'], {
    errorMap: () => ({ message: 'Status must be PENDING, APPROVED, REJECTED, or FLAGGED' }),
  }),
});

export const adminReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(1, 'Merchant reply cannot be empty')
    .max(3000, 'Merchant reply cannot exceed 3000 characters'),
});

export const adminReviewParamIdSchema = z.object({
  id: z.string().uuid('Invalid Review ID format'),
});
