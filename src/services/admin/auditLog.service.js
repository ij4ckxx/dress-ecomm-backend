import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Retrieves paginated audit logs with search and filtering
 */
export const getAuditLogsService = async ({ query }) => {
  const {
    page = 1,
    limit = 20,
    action,
    entity,
    userId,
    startDate,
    endDate,
    search,
  } = query;

  const skip = (page - 1) * limit;
  const where = {};

  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (entity) where.entity = { contains: entity, mode: 'insensitive' };
  if (userId) where.userId = userId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single audit log entry
 */
export const getAuditLogByIdService = async (logId) => {
  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!log) {
    throw createServiceError('Audit log entry not found', HTTP_STATUS.NOT_FOUND, 'AUDIT_LOG_NOT_FOUND');
  }

  return log;
};
