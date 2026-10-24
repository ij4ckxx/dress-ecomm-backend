import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  title: z
    .string()
    .trim()
    .max(150, 'Review title cannot exceed 150 characters')
    .optional()
    .nullable(),
  comment: z
    .string()
    .trim()
    .min(3, 'Review comment must be at least 3 characters')
    .max(3000, 'Review comment cannot exceed 3000 characters'),
  fitFeedback: z
    .enum(['RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE'], {
      errorMap: () => ({ message: 'fitFeedback must be RUNS_SMALL, TRUE_TO_SIZE, or RUNS_LARGE' }),
    })
    .optional()
    .nullable(),
  images: z
    .union([
      z.array(z.string().url('Each image must be a valid URL')),
      z.string(),
    ])
    .optional()
    .nullable(),
});

export const updateReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars')
    .optional(),
  title: z
    .string()
    .trim()
    .max(150, 'Review title cannot exceed 150 characters')
    .optional()
    .nullable(),
  comment: z
    .string()
    .trim()
    .min(3, 'Review comment must be at least 3 characters')
    .max(3000, 'Review comment cannot exceed 3000 characters')
    .optional(),
  fitFeedback: z
    .enum(['RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE'])
    .optional()
    .nullable(),
  images: z
    .union([
      z.array(z.string().url('Each image must be a valid URL')),
      z.string(),
    ])
    .optional()
    .nullable(),
});

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  fitFeedback: z.enum(['RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE']).optional(),
  hasImages: z.coerce.boolean().optional(),
  sortBy: z
    .enum(['newest', 'oldest', 'highest_rating', 'lowest_rating', 'most_helpful'])
    .default('newest'),
});

export const reviewIdParamSchema = z.object({
  id: z.string().uuid('Invalid Review ID format'),
});

export const productIdParamSchema = z.object({
  id: z.string().min(1, 'Product identifier is required'),
});

export const productSlugOrIdParamSchema = z.object({
  slugOrId: z.string().min(1, 'Product slug or ID is required'),
});
