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

/**
 * Middleware factory for validating URL query parameters with Zod
 * @param {import('zod').ZodSchema} schema
 */
export const validateQuery = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const issues = parsed.error.issues || parsed.error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: formattedErrors[0]?.message || 'Invalid query parameters',
        error: {
          code: 'VALIDATION_ERROR',
          details: formattedErrors,
        },
      });
    }

    // Express 5 defines req.query as a getter, so we mutate rather than reassign
    for (const key of Object.keys(req.query)) {
      delete req.query[key];
    }
    Object.assign(req.query, parsed.data);
    req.validatedQuery = parsed.data;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware factory for validating route parameters with Zod
 * @param {import('zod').ZodSchema} schema
 */
export const validateParams = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      const issues = parsed.error.issues || parsed.error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: formattedErrors[0]?.message || 'Invalid route parameters',
        error: {
          code: 'VALIDATION_ERROR',
          details: formattedErrors,
        },
      });
    }

    Object.assign(req.params, parsed.data);
    req.validatedParams = parsed.data;
    next();
  } catch (error) {
    next(error);
  }
};

