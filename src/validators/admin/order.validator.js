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

const PAYMENT_STATUS_ENUM = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
const PAYMENT_METHOD_ENUM = ['RAZORPAY', 'STRIPE', 'COD'];

export const orderParamIdSchema = z.object({
  id: z.string().uuid('Invalid Order ID format'),
});

export const queryAdminOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', ...ORDER_STATUS_ENUM]).default('ALL'),
  paymentStatus: z.enum(['ALL', ...PAYMENT_STATUS_ENUM]).default('ALL'),
  paymentMethod: z.enum(['ALL', ...PAYMENT_METHOD_ENUM]).default('ALL'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  sort: z
    .enum(['newest', 'oldest', 'total_asc', 'total_desc'])
    .default('newest'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_ENUM, {
    required_error: 'New order status is required',
  }),
  comment: z.string().trim().max(500).optional(),
});

export const updateOrderShippingSchema = z.object({
  courierPartner: z
    .string({ required_error: 'Courier partner is required' })
    .trim()
    .min(2, 'Courier partner name must be at least 2 characters')
    .max(100, 'Courier partner cannot exceed 100 characters'),
  trackingNumber: z
    .string({ required_error: 'Tracking number / AWB is required' })
    .trim()
    .min(3, 'Tracking number must be at least 3 characters')
    .max(100, 'Tracking number cannot exceed 100 characters'),
  estimatedDelivery: z.string().datetime().optional().nullable(),
  status: z.enum(['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY']).default('SHIPPED'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateOrderNotesSchema = z.object({
  internalAdminNotes: z
    .string({ required_error: 'Internal admin note is required' })
    .trim()
    .max(1000, 'Internal notes cannot exceed 1000 characters'),
});

export const cancelOrderSchema = z.object({
  reason: z
    .string({ required_error: 'Cancellation reason is required' })
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500, 'Cancellation reason cannot exceed 500 characters'),
});
