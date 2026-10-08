import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * General rate limiter for Admin API endpoints
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many administrative requests. Please slow down.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

/**
 * Strict rate limiter for sensitive authentication / user creation actions
 */
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many attempts. Please try again after 15 minutes.',
    error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' },
  },
});
