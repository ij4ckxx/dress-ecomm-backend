import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../utils/jwt.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ROLES } from '../constants/roles.js';
import { AUTH_CONSTANTS } from '../constants/auth.constants.js';

export class AuthService {
  /**
   * Register a new user (Customer or Admin)
   */
  static async register({ name, email, password, phone, role = ROLES.CUSTOMER }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError(
        'An account with this email already exists',
        HTTP_STATUS.CONFLICT,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    // Hash the password securely
    const passwordHash = await hashPassword(password);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        role: role || ROLES.CUSTOMER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login user with credentials
   */
  static async login({ email, password, userAgent = null, ipAddress = null }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user with password hash
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error message to prevent user enumeration
    if (!user || !user.isActive) {
      throw new AppError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_CREDENTIALS'
      );
    }

    // Check if account has a password set (social accounts may not have a password)
    if (!user.passwordHash) {
      throw new AppError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_CREDENTIALS'
      );
    }

    // Verify password hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_CREDENTIALS'
      );
    }

    // Generate JWT access token
    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    // Generate cryptographically random refresh token
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);

    // Calculate expiry (7 days from now)
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.COOKIE_MAX_AGE_MS);

    // Save hashed refresh token in database
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    // Return safe user information and tokens
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Logout user and invalidate refresh token
   */
  static async logout({ refreshToken }) {
    if (!refreshToken) {
      return { revoked: false };
    }

    const tokenHash = hashToken(refreshToken);

    // Revoke or delete from database (idempotent: deleteMany won't throw if not found)
    await prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });

    return { revoked: true };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  static async refresh({ refreshToken, userAgent = null, ipAddress = null }) {
    if (!refreshToken) {
      throw new AppError(
        'Refresh token is required',
        HTTP_STATUS.UNAUTHORIZED,
        'TOKEN_REQUIRED'
      );
    }

    const tokenHash = hashToken(refreshToken);

    // Find active token
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!existingToken || existingToken.revokedAt || existingToken.expiresAt < new Date()) {
      throw new AppError(
        'Refresh token is invalid or expired',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_REFRESH_TOKEN'
      );
    }

    if (!existingToken.user || !existingToken.user.isActive) {
      throw new AppError(
        'User account is inactive or not found',
        HTTP_STATUS.UNAUTHORIZED,
        'ACCOUNT_INACTIVE'
      );
    }

    // Token rotation: delete old token, generate new one
    await prisma.refreshToken.delete({
      where: { id: existingToken.id },
    });

    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.COOKIE_MAX_AGE_MS);

    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: existingToken.user.id,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    const newAccessToken = generateAccessToken({
      id: existingToken.user.id,
      role: existingToken.user.role,
      email: existingToken.user.email,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: existingToken.user,
    };
  }
}
