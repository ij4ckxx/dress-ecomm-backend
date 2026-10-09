import { z } from 'zod';

export const queryAdminInventorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).default('ALL'),
  categoryId: z.string().uuid('Invalid Category ID format').optional(),
  sort: z
    .enum(['stock_asc', 'stock_desc', 'name_asc', 'sku_asc', 'newest'])
    .default('stock_asc'),
});

export const adjustStockSchema = z
  .object({
    variantId: z.string().uuid('Invalid Variant ID format').optional(),
    productId: z.string().uuid('Invalid Product ID format').optional(),
    delta: z.coerce.number().int().optional(), // e.g. +10 or -3
    newStock: z.coerce.number().int().min(0, 'Stock cannot be negative').optional(), // Absolute count
    type: z
      .enum(['RESTOCK', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE'])
      .default('ADJUSTMENT'),
    reason: z
      .string({ required_error: 'Adjustment reason is required' })
      .trim()
      .min(3, 'Reason must be at least 3 characters long')
      .max(500, 'Reason cannot exceed 500 characters'),
    referenceId: z.string().trim().max(100).optional().nullable(), // PO number, receipt ID, etc.
  })
  .refine((data) => data.variantId || data.productId, {
    message: 'Either variantId or productId must be specified',
    path: ['variantId'],
  })
  .refine((data) => data.delta !== undefined || data.newStock !== undefined, {
    message: 'Either delta or newStock must be provided',
    path: ['delta'],
  });

export const queryInventoryTransactionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  variantId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  type: z.enum(['RESTOCK', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateStockThresholdSchema = z
  .object({
    variantId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    lowStockThreshold: z.coerce
      .number({ required_error: 'lowStockThreshold is required' })
      .int()
      .min(0, 'Threshold must be >= 0')
      .max(10000, 'Threshold cannot exceed 10,000'),
  })
  .refine((data) => data.variantId || data.productId, {
    message: 'Either variantId or productId must be specified',
    path: ['variantId'],
  });
