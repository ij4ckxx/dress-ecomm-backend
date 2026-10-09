import { z } from 'zod';

export const analyticsPeriodSchema = z.object({
  period: z
    .enum(['7d', '30d', '90d', 'year'])
    .default('30d'),
});

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
  period: z.enum(['7d', '30d', '90d', 'year', 'all']).default('30d'),
});
