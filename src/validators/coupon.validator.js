import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z
    .string({ required_error: 'Coupon code is required' })
    .trim()
    .min(1, 'Coupon code cannot be empty'),
  subtotal: z
    .number({ invalid_type_error: 'Subtotal must be a valid number' })
    .min(0, 'Subtotal cannot be negative')
    .optional(),
});
