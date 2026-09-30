import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware factory for Zod schema validation
 * @param {import('zod').ZodSchema} schema
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues || parsed.error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: formattedErrors[0]?.message || 'Validation failed',
        error: {
          code: 'VALIDATION_ERROR',
          details: formattedErrors,
        },
      });
    }

    req.body = parsed.data;
    next();
  } catch (error) {
    next(error);
  }
};
