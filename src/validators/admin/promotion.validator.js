import { z } from 'zod';

export const promotionParamIdSchema = z.object({
  id: z.string().uuid('Invalid Promotion Campaign ID format'),
});

export const queryAdminPromotionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'EXPIRED']).default('ALL'),
  sort: z.enum(['newest', 'oldest', 'sortOrder_asc']).default('sortOrder_asc'),
});

export const createPromotionSchema = z
  .object({
    title: z
      .string({ required_error: 'Promotion title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    subtitle: z.string().trim().max(300).optional().nullable(),
    badge: z.string().trim().max(50).optional().nullable(),
    discountPercentage: z.coerce.number().int().min(1).max(100).optional().nullable(),
    couponCode: z.string().trim().max(30).optional().nullable(),
    startDate: z.string({ required_error: 'Start date is required' }).datetime(),
    endDate: z.string({ required_error: 'End date is required' }).datetime(),
    backgroundImage: z.string().url('Invalid background image URL').optional().nullable(),
    ctaText: z.string().trim().max(50).default('SHOP THE SALE'),
    ctaLink: z.string().trim().max(200).default('/products'),
    sortOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    {
      message: 'End date must be strictly after start date',
      path: ['endDate'],
    }
  );

export const updatePromotionSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    subtitle: z.string().trim().max(300).optional().nullable(),
    badge: z.string().trim().max(50).optional().nullable(),
    discountPercentage: z.coerce.number().int().min(1).max(100).optional().nullable(),
    couponCode: z.string().trim().max(30).optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    backgroundImage: z.string().url().optional().nullable(),
    ctaText: z.string().trim().max(50).optional(),
    ctaLink: z.string().trim().max(200).optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be strictly after start date',
      path: ['endDate'],
    }
  );

export const togglePromotionStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});
