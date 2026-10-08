import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ROLES, ROLE_HIERARCHY, CREATABLE_ROLES } from '../../constants/roles.js';
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '../../constants/permissions.js';

/**
 * Custom error helper for service layer
 */
const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Resolves effective permissions held by an admin user
 */
const resolveEffectivePermissions = (user) => {
  if (user.role === ROLES.SUPER_ADMIN) {
    return Object.values(PERMISSIONS);
  }
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions;
  }
  return ROLE_DEFAULT_PERMISSIONS[user.role] || [];
};

/**
 * Creates a subordinate user according to strict hierarchy rules
 */
export const createUserService = async ({ creator, userData }) => {
  const { name, email, password, role, phone, permissions = [] } = userData;

  // 1. Validate creation hierarchy
  const allowedRolesToCreate = CREATABLE_ROLES[creator.role] || [];
  if (!allowedRolesToCreate.includes(role)) {
    throw createServiceError(
      `Access denied. As a ${creator.role}, you are only allowed to create: ${allowedRolesToCreate.join(', ') || 'none'}.`,
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN_ROLE_CREATION'
    );
  }

  // 2. Validate email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw createServiceError(
      'A user with this email address already exists.',
      HTTP_STATUS.CONFLICT,
      'USER_ALREADY_EXISTS'
    );
  }

  // 3. Validate permissions delegation
  let assignedPermissions = [];

  if (role === ROLES.CUSTOMER) {
    // Customers never get administrative permissions
    assignedPermissions = [];
  } else if (creator.role === ROLES.SUPER_ADMIN) {
    // SUPER_ADMIN can assign any valid permissions or default to role preset
    assignedPermissions = permissions.length > 0 ? permissions : (ROLE_DEFAULT_PERMISSIONS[role] || []);
  } else if (creator.role === ROLES.STORE_ADMIN) {
    // STORE_ADMIN can only delegate permissions that they themselves possess
    const creatorPerms = resolveEffectivePermissions(creator);
    const requestedPerms = permissions.length > 0 ? permissions : (ROLE_DEFAULT_PERMISSIONS[role] || []);

    const hasUnauthorizedPerms = requestedPerms.some((p) => !creatorPerms.includes(p));
    if (hasUnauthorizedPerms) {
      throw createServiceError(
        'You cannot grant permissions that you do not personally possess.',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN_PERMISSION_DELEGATION'
      );
    }
    assignedPermissions = requestedPerms;
  }

  // 4. Hash password with bcrypt
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // 5. Create user in database with creator link
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone: phone || null,
      role,
      permissions: assignedPermissions,
      createdById: creator.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      phone: true,
      isActive: true,
      createdById: true,
      createdAt: true,
    },
  });

  return newUser;
};

/**
 * Retrieves a paginated list of users visible to the current admin
 */
export const getUsersService = async ({ currentUser, query }) => {
  const { page = 1, limit = 20, role, search, isActive } = query;
  const skip = (page - 1) * limit;

  // Build hierarchical visibility filter
  const where = {};

  if (currentUser.role === ROLES.SUPER_ADMIN) {
    // Super admin can see anyone, optionally filtered by role
    if (role) where.role = role;
  } else if (currentUser.role === ROLES.STORE_ADMIN) {
    // Store admin can only see STAFF and CUSTOMERs
    if (role) {
      if (![ROLES.STAFF, ROLES.CUSTOMER].includes(role)) {
        throw createServiceError(
          'You can only view Staff and Customers.',
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN_USER_QUERY'
        );
      }
      where.role = role;
    } else {
      where.role = { in: [ROLES.STAFF, ROLES.CUSTOMER] };
    }
  } else if (currentUser.role === ROLES.STAFF) {
    // Staff can only see CUSTOMERs
    where.role = ROLES.CUSTOMER;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        phone: true,
        isActive: true,
        createdById: true,
        creator: {
          select: { id: true, name: true, role: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single user by ID with hierarchy enforcement
 */
export const getUserByIdService = async ({ currentUser, userId }) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      phone: true,
      isActive: true,
      createdById: true,
      creator: {
        select: { id: true, name: true, role: true },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!targetUser) {
    throw createServiceError('User not found', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
  }

  // Hierarchy check: non-super-admins cannot inspect higher-level accounts
  const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0;
  const currentLevel = ROLE_HIERARCHY[currentUser.role] || 0;

  if (currentUser.id !== targetUser.id && targetLevel >= currentLevel && currentUser.role !== ROLES.SUPER_ADMIN) {
    throw createServiceError(
      'Access denied. You cannot view user details of an equal or higher rank.',
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN_USER_VIEW'
    );
  }

  return targetUser;
};

/**
 * Updates a subordinate user (name, phone, permissions, status)
 */
export const updateUserService = async ({ currentUser, targetUserId, updateData }) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, permissions: true },
  });

  if (!targetUser) {
    throw createServiceError('User not found', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
  }

  const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0;
  const currentLevel = ROLE_HIERARCHY[currentUser.role] || 0;

  // Cannot modify an account with equal or higher rank
  if (targetLevel >= currentLevel && currentUser.role !== ROLES.SUPER_ADMIN) {
    throw createServiceError(
      'Access denied. You cannot modify a user with an equal or higher rank.',
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN_USER_UPDATE'
    );
  }

  const dataToUpdate = {};
  if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
  if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone;
  if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive;

  // Permissions update with delegation validation
  if (updateData.permissions !== undefined) {
    if (targetUser.role === ROLES.CUSTOMER) {
      dataToUpdate.permissions = [];
    } else if (currentUser.role === ROLES.SUPER_ADMIN) {
      dataToUpdate.permissions = updateData.permissions;
    } else {
      const creatorPerms = resolveEffectivePermissions(currentUser);
      const hasUnauthorized = updateData.permissions.some((p) => !creatorPerms.includes(p));
      if (hasUnauthorized) {
        throw createServiceError(
          'You cannot assign permissions you do not personally possess.',
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN_PERMISSION_DELEGATION'
        );
      }
      dataToUpdate.permissions = updateData.permissions;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      phone: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

/**
 * Toggles a user's active/deactivated status
 */
export const toggleUserStatusService = async ({ currentUser, targetUserId, isActive }) => {
  if (currentUser.id === targetUserId) {
    throw createServiceError(
      'You cannot deactivate your own administrative account.',
      HTTP_STATUS.BAD_REQUEST,
      'CANNOT_DEACTIVATE_SELF'
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    throw createServiceError('User not found', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
  }

  const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0;
  const currentLevel = ROLE_HIERARCHY[currentUser.role] || 0;

  if (targetLevel >= currentLevel && currentUser.role !== ROLES.SUPER_ADMIN) {
    throw createServiceError(
      'Access denied. You cannot alter the status of an equal or higher ranking user.',
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN_STATUS_TOGGLE'
    );
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updated;
};

/**
 * Returns permissions that the current admin is allowed to delegate
 */
export const getAvailablePermissionsService = (currentUser) => {
  return resolveEffectivePermissions(currentUser);
};
