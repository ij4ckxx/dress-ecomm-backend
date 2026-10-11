import prisma from '../../config/db.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Splits a full name string into firstName and lastName
 * @param {string} fullName
 * @returns {{ firstName: string, lastName: string }}
 */
export const splitName = (fullName = '') => {
  const trimmed = (fullName || '').trim();
  const firstSpaceIndex = trimmed.indexOf(' ');

  if (firstSpaceIndex === -1) {
    return {
      firstName: trimmed,
      lastName: '',
    };
  }

  return {
    firstName: trimmed.slice(0, firstSpaceIndex).trim(),
    lastName: trimmed.slice(firstSpaceIndex + 1).trim(),
  };
};

/**
 * Retrieves account details for the authenticated customer
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<object>} Customer account details
 */
export const getAccountDetailsService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(
      'Customer account not found or deactivated',
      HTTP_STATUS.NOT_FOUND,
      'USER_NOT_FOUND'
    );
  }

  const { firstName, lastName } = splitName(user.name);

  return {
    id: user.id,
    firstName,
    lastName,
    name: user.name,
    email: user.email,
    phoneNumber: user.phone,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Updates account details for the authenticated customer
 * @param {string} userId - Authenticated user UUID
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.email
 * @param {string|null} [params.phoneNumber]
 * @param {string|null} [params.phone]
 * @returns {Promise<object>} Updated customer account details
 */
export const updateAccountDetailsService = async (userId, { firstName, lastName, email, phoneNumber, phone }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Fetch current user to verify existence and check for email changes
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isActive: true },
  });

  if (!currentUser || !currentUser.isActive) {
    throw new AppError(
      'Customer account not found or deactivated',
      HTTP_STATUS.NOT_FOUND,
      'USER_NOT_FOUND'
    );
  }

  // 2. If email is being changed, ensure it is not already used by another account
  if (normalizedEmail !== currentUser.email) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingEmailUser && existingEmailUser.id !== userId) {
      throw new AppError(
        'An account with this email address already exists',
        HTTP_STATUS.CONFLICT,
        'EMAIL_ALREADY_EXISTS'
      );
    }
  }

  // 3. Normalize name and phone
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const rawPhone = phoneNumber !== undefined ? phoneNumber : phone;
  const cleanPhone = rawPhone && String(rawPhone).trim() !== '' ? String(rawPhone).trim() : null;

  // 4. Update customer record
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: fullName,
      email: normalizedEmail,
      phone: cleanPhone,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const { firstName: fName, lastName: lName } = splitName(updatedUser.name);

  return {
    id: updatedUser.id,
    firstName: fName,
    lastName: lName,
    name: updatedUser.name,
    email: updatedUser.email,
    phoneNumber: updatedUser.phone,
    phone: updatedUser.phone,
    role: updatedUser.role,
    avatarUrl: updatedUser.avatarUrl,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };
};

/**
 * Changes customer password with current password verification
 * @param {string} userId - Authenticated user UUID
 * @param {object} params
 * @param {string} params.currentPassword
 * @param {string} params.newPassword
 * @returns {Promise<{ message: string }>}
 */
export const changePasswordService = async (userId, { currentPassword, newPassword }) => {
  // 1. Fetch user with password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(
      'Customer account not found or deactivated',
      HTTP_STATUS.NOT_FOUND,
      'USER_NOT_FOUND'
    );
  }

  // 2. Handle accounts with no password (e.g. social login)
  if (!user.passwordHash) {
    throw new AppError(
      'This account does not have a local password set (registered via social login). Please use password recovery or continue via your social provider.',
      HTTP_STATUS.BAD_REQUEST,
      'NO_LOCAL_PASSWORD'
    );
  }

  // 3. Verify current password
  const isMatch = await comparePassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError(
      'Current password is incorrect',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CURRENT_PASSWORD'
    );
  }

  // 4. Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // 5. Update password in database
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // 6. Invalidate existing sessions / refresh tokens for security
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  return {
    message: 'Password changed successfully. Please log in again with your new password.',
  };
};
