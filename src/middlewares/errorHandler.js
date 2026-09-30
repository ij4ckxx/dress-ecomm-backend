import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { sendError } from '../utils/apiResponse.js';
import { ENV } from '../config/env.js';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'An unexpected internal error occurred';
  const code = err.code || 'INTERNAL_ERROR';

  // In production, avoid leaking internal Prisma or library details
  const isProduction = ENV.NODE_ENV === 'production';
  const errorDetails = isProduction
    ? { code }
    : {
        code,
        stack: err.stack,
        originalError: err.name,
      };

  return sendError(res, {
    statusCode,
    message,
    error: errorDetails,
  });
};
