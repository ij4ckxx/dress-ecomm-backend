import { z } from 'zod';

export const auditLogParamIdSchema = z.object({
  id: z.string().uuid('Invalid Audit Log ID format'),
});

export const queryAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().trim().optional(),
});
