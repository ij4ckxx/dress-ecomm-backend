import { z } from 'zod';

const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url('Invalid background image URL').optional().nullable()
);

const coerceBoolean = (defaultVal) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      if (v.toLowerCase() === 'true') return true;
      if (v.toLowerCase() === 'false') return false;
    }
    return v;
  }, defaultVal !== undefined ? z.boolean().default(defaultVal) : z.boolean().optional());

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
    discountPercentage: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.coerce.number().int().min(1).max(100).optional().nullable()
    ),
    couponCode: z.string().trim().max(30).optional().nullable(),
    startDate: z.string({ required_error: 'Start date is required' }),
    endDate: z.string({ required_error: 'End date is required' }),
    backgroundImage: optionalUrl,
    ctaText: z.string().trim().max(50).default('SHOP THE SALE'),
    ctaLink: z.string().trim().max(200).default('/products'),
    sortOrder: z.coerce.number().int().default(0),
    isActive: coerceBoolean(true),
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
    discountPercentage: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.coerce.number().int().min(1).max(100).optional().nullable()
    ),
    couponCode: z.string().trim().max(30).optional().nullable(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    backgroundImage: optionalUrl,
    ctaText: z.string().trim().max(50).optional(),
    ctaLink: z.string().trim().max(200).optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: coerceBoolean(),
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
  isActive: coerceBoolean(true),
});
