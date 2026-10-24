import crypto from 'crypto';
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
import { ENV } from '../config/env.js';
import {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
} from './notification/email.service.js';

export class AuthService {
  /**
   * Register a new user (Customer or Admin)
   */
  static async register({ name, email, password, phone, avatarUrl = null }) {
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

    // Create customer in database (strictly enforced to CUSTOMER role)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        avatarUrl: avatarUrl ? avatarUrl.trim() : null,
        role: ROLES.CUSTOMER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
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

  /**
   * Authenticate or register user via Social OAuth (Google, Facebook, Apple, GitHub)
   */
  static async socialLogin({
    provider,
    token = null,
    providerAccountId = null,
    email = null,
    name = null,
    avatarUrl = null,
    userAgent = null,
    ipAddress = null,
  }) {
    let resolvedEmail = email ? email.toLowerCase().trim() : null;
    let resolvedProviderAccountId = providerAccountId ? String(providerAccountId).trim() : null;
    let resolvedName = name ? name.trim() : null;
    let resolvedAvatarUrl = avatarUrl ? avatarUrl.trim() : null;

    // If token is provided and provider is Google, attempt verification via Google OAuth APIs
    if (token && provider === 'google') {
      try {
        // Try Google ID Token verification via tokeninfo
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const payload = await res.json();
          if (payload.sub) {
            resolvedProviderAccountId = payload.sub;
            resolvedEmail = payload.email ? payload.email.toLowerCase().trim() : resolvedEmail;
            resolvedName = payload.name || resolvedName;
            resolvedAvatarUrl = payload.picture || resolvedAvatarUrl;
          }
        } else {
          // Fallback: try UserInfo endpoint (if access_token was passed instead of id_token)
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userRes.ok) {
            const userPayload = await userRes.json();
            if (userPayload.sub) {
              resolvedProviderAccountId = userPayload.sub;
              resolvedEmail = userPayload.email ? userPayload.email.toLowerCase().trim() : resolvedEmail;
              resolvedName = userPayload.name || resolvedName;
              resolvedAvatarUrl = userPayload.picture || resolvedAvatarUrl;
            }
          }
        }
      } catch (err) {
        console.warn('[GOOGLE TOKEN VERIFY WARNING]:', err.message);
      }
    }

    if (!resolvedEmail) {
      throw new AppError(
        'Email address could not be verified from the social provider',
        HTTP_STATUS.BAD_REQUEST,
        'OAUTH_EMAIL_REQUIRED'
      );
    }

    if (!resolvedProviderAccountId) {
      // Fallback: use email as providerAccountId if provider didn't return a sub
      resolvedProviderAccountId = resolvedEmail;
    }

    // 1. Find if this provider + providerAccountId already has a linked user
    let account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: resolvedProviderAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    let user = account?.user;

    // 2. If not linked by account, find user by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: resolvedEmail },
      });

      if (user) {
        // User already exists (e.g. registered with password). Link this social account!
        await prisma.account.create({
          data: {
            userId: user.id,
            provider,
            providerAccountId: resolvedProviderAccountId,
          },
        });
      } else {
        // First-time social sign-in: Create new User and link Account atomically
        user = await prisma.user.create({
          data: {
            name: resolvedName || resolvedEmail.split('@')[0],
            email: resolvedEmail,
            avatarUrl: resolvedAvatarUrl,
            role: ROLES.CUSTOMER,
            isActive: true,
            passwordHash: null,
            accounts: {
              create: {
                provider,
                providerAccountId: resolvedProviderAccountId,
              },
            },
          },
        });
      }
    }

    // 3. Ensure user account is active
    if (!user.isActive) {
      throw new AppError(
        'Your account has been deactivated. Please contact support.',
        HTTP_STATUS.FORBIDDEN,
        'ACCOUNT_DEACTIVATED'
      );
    }

    // 4. Update avatar if user doesn't have one
    if (!user.avatarUrl && resolvedAvatarUrl) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: resolvedAvatarUrl },
      });
      user.avatarUrl = resolvedAvatarUrl;
    }

    // 5. Generate Access Token & Refresh Token
    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.COOKIE_MAX_AGE_MS);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }
}

/**
 * Initiates the forgot password flow by generating a secure token and sending email
 * @param {object} params
 * @param {string} params.email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // Always return identical success message to prevent user enumeration
  if (!user || !user.isActive) {
    return {
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched.',
    };
  }

  // Generate 32-byte secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  // Remove any pre-existing tokens for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email: normalizedEmail },
  });

  // Store new token record
  await prisma.passwordResetToken.create({
    data: {
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  // Construct reset link URL
  const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

  // Asynchronously dispatch the email
  sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  }).catch((err) => console.error('[PASSWORD RESET EMAIL ERROR]:', err));

  return {
    success: true,
    message: 'If an account exists with that email, a password reset link has been dispatched.',
  };
};

/**
 * Resets password using the one-time token
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.token
 * @param {string} params.newPassword
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const resetPasswordWithToken = async ({ email, token, newPassword }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const tokenHash = hashToken(token.trim());

  // 1. Locate valid token
  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      email: normalizedEmail,
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetRecord) {
    throw new AppError(
      'Invalid or expired password reset link. Please request a new one.',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_OR_EXPIRED_RESET_TOKEN'
    );
  }

  // 2. Fetch user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
  }

  // 3. Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // 4. Update password and invalidate token & active sessions atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  // 5. Send confirmation email
  sendPasswordResetSuccessEmail({
    to: user.email,
    name: user.name,
  }).catch((err) => console.error('[PASSWORD RESET SUCCESS EMAIL ERROR]:', err));

  return {
    success: true,
    message: 'Password has been successfully reset. Please log in with your new credentials.',
  };
};

