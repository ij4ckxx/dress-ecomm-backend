import {
  AuthService,
  requestPasswordReset,
  resetPasswordWithToken,
} from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { AUTH_CONSTANTS } from '../constants/auth.constants.js';
import { ENV } from '../config/env.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

export class AuthController {
  /**
   * Register a new user (supports direct avatar file upload OR avatarUrl string)
   */
  static async register(req, res, next) {
    try {
      let avatarUrl = req.body.avatarUrl || null;

      if (req.file) {
        const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/avatars');
        avatarUrl = uploaded.url;
      }

      const user = await AuthService.register({
        ...req.body,
        avatarUrl,
      });

      return sendSuccess(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: 'Registration successful',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log in user, issue access token & set HttpOnly refresh token cookie
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || null;

      const { user, accessToken, refreshToken } = await AuthService.login({
        email,
        password,
        userAgent,
        ipAddress,
      });

      // Set secure HttpOnly cookie for the refresh token
      res.cookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: AUTH_CONSTANTS.COOKIE_MAX_AGE_MS,
      });

      return sendSuccess(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Login successful',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log in or register user via Social OAuth (Google, Facebook, Apple, GitHub)
   */
  static async socialLogin(req, res, next) {
    try {
      const { provider, token, providerAccountId, email, name, avatarUrl } = req.body;
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || null;

      const { user, accessToken, refreshToken } = await AuthService.socialLogin({
        provider,
        token,
        providerAccountId,
        email,
        name,
        avatarUrl,
        userAgent,
        ipAddress,
      });

      // Set secure HttpOnly cookie for the refresh token
      res.cookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: AUTH_CONSTANTS.COOKIE_MAX_AGE_MS,
      });

      return sendSuccess(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Social login successful',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log out user, invalidate session, and clear cookies
   */
  static async logout(req, res, next) {
    try {
      // Get refresh token from cookie or body
      const refreshToken =
        req.cookies?.[AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME] ||
        req.body?.refreshToken;

      await AuthService.logout({ refreshToken });

      // Clear refresh token cookie
      res.clearCookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
      });

      return sendSuccess(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user profile
   */
  static async getMe(req, res, next) {
    try {
      return sendSuccess(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Profile fetched successfully',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token using HttpOnly cookie or request body refreshToken
   */
  static async refreshToken(req, res, next) {
    try {
      const refreshToken =
        req.cookies?.[AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME] ||
        req.body?.refreshToken;

      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || null;

      const { accessToken, refreshToken: newRefreshToken, user } =
        await AuthService.refresh({
          refreshToken,
          userAgent,
          ipAddress,
        });

      // Set new rotated refresh token in secure HttpOnly cookie
      res.cookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: AUTH_CONSTANTS.COOKIE_MAX_AGE_MS,
      });

      return sendSuccess(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Token refreshed successfully',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Controller to initiate forgot password email flow
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await requestPasswordReset({ email });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to reset password using one-time token
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;
    const result = await resetPasswordWithToken({ email, token, newPassword });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

