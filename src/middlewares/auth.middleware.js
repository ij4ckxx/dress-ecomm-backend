import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ROLES } from '../constants/roles.js';
import { ROLE_DEFAULT_PERMISSIONS } from '../constants/permissions.js';
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
    } catch {
      return sendError(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Invalid or expired access token',
        error: { code: 'INVALID_TOKEN' },
      });
    }

    // 3. Verify user still exists & is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdById: true,
        isActive: true,
      },
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

/**
 * Admin portal guard: ensures user has an administrative role (SUPER_ADMIN, STORE_ADMIN, or STAFF)
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Authentication required. Please log in to proceed.',
      error: { code: 'UNAUTHORIZED' },
    });
  }

  const adminRoles = [ROLES.SUPER_ADMIN, ROLES.STORE_ADMIN, ROLES.STAFF];
  if (!adminRoles.includes(req.user.role)) {
    return sendError(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: 'Access denied. Administrative privileges required.',
      error: { code: 'FORBIDDEN_NOT_ADMIN' },
    });
  }

  next();
};

/**
 * Granular permission guard: checks if user has specific required permission(s)
 * - SUPER_ADMIN always passes.
 * - STORE_ADMIN & STAFF check their custom permissions or fallback role defaults.
 * @param {...string} requiredPermissions
 */
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Authentication required. Please log in to proceed.',
        error: { code: 'UNAUTHORIZED' },
      });
    }

    // SUPER_ADMIN has full root access across all modules
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Resolve user's permissions: use explicit assigned permissions if present, else role defaults
    const userPermissions =
      req.user.permissions && req.user.permissions.length > 0
        ? req.user.permissions
        : ROLE_DEFAULT_PERMISSIONS[req.user.role] || [];

    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAll) {
      return sendError(res, {
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: `Access denied. Missing required permission(s): ${requiredPermissions.join(', ')}`,
        error: { code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS' },
      });
    }

    next();
  };
};

/**
 * Middleware that optionally authenticates requests.
 * If a valid JWT token is provided, sets req.user.
 * If no token or invalid token is provided, sets req.user = null and continues without error.
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdById: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch {
    req.user = null;
    next();
  }
};
