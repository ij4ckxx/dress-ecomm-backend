import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { sendError } from '../utils/apiResponse.js';
import { verifyAccessToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

/**
 * Middleware to authenticate requests via JWT access token
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return sendError(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Authentication required. Please log in to proceed.',
        error: { code: 'UNAUTHORIZED' },
      });
    }

    // 2. Verify Access Token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return sendError(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Invalid or expired access token',
        error: { code: 'INVALID_TOKEN' },
      });
    }

    // 3. Optional: Verify user still exists & is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'User account not found or deactivated',
        error: { code: 'ACCOUNT_INACTIVE' },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * @param  {...string} allowedRoles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Authentication required',
        error: { code: 'UNAUTHORIZED' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, {
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'You do not have permission to perform this action',
        error: { code: 'FORBIDDEN' },
      });
    }

    next();
  };
};
