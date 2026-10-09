import {
  getAuditLogsService,
  getAuditLogByIdService,
} from '../../services/admin/auditLog.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await getAuditLogsService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Audit logs fetched successfully',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await getAuditLogByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Audit log details fetched successfully',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};
