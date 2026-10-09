import { z } from 'zod';

export const couponParamIdSchema = z.object({
  id: z.string().uuid('Invalid Coupon ID format'),
});

export const queryAdminCouponsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'INACTIVE']).default('ALL'),
  discountType: z.enum(['ALL', 'PERCENTAGE', 'FIXED']).default('ALL'),
  sort: z
    .enum(['newest', 'oldest', 'code_asc', 'used_desc'])
    .default('newest'),
});

export const createCouponSchema = z
  .object({
    code: z
      .string({ required_error: 'Coupon code is required' })
      .trim()
      .min(3, 'Coupon code must be at least 3 characters')
      .max(30, 'Coupon code cannot exceed 30 characters')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Coupon code can only contain letters, numbers, underscores, and dashes'
      )
      .transform((val) => val.toUpperCase()),
    description: z.string().trim().max(500).optional().nullable(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
    discountValue: z.coerce
      .number({ required_error: 'Discount value is required' })
      .positive('Discount value must be greater than 0'),
    minOrderAmount: z.coerce.number().min(0).default(0),
    maxDiscountAmount: z.coerce.number().positive().optional().nullable(),
    startDate: z.string({ required_error: 'Start date is required' }).datetime(),
    endDate: z.string({ required_error: 'End date is required' }).datetime(),
    usageLimit: z.coerce.number().int().min(1).default(500),
    perUserLimit: z.coerce.number().int().min(1).default(1),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    {
      message: 'End date must be strictly after start date',
      path: ['endDate'],
    }
  );

export const updateCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((val) => val.toUpperCase())
      .optional(),
    description: z.string().trim().max(500).optional().nullable(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.coerce.number().positive().optional(),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxDiscountAmount: z.coerce.number().positive().optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    usageLimit: z.coerce.number().int().min(1).optional(),
    perUserLimit: z.coerce.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.discountType === 'PERCENTAGE' && data.discountValue && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue'],
    }
  )
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

export const toggleCouponStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});
