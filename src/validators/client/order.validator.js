import { z } from 'zod';

const ORDER_STATUS_ENUM = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
];

export const orderNumberParamSchema = z.object({
  orderNumber: z
    .string({ required_error: 'Order number is required' })
    .trim()
    .min(3, 'Order number must be at least 3 characters')
    .max(50, 'Order number cannot exceed 50 characters'),
});

export const customerOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['ALL', ...ORDER_STATUS_ENUM]).default('ALL'),
});

export const customerCancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .optional(),
});
