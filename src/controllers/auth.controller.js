import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { AUTH_CONSTANTS } from '../constants/auth.constants.js';
import { ENV } from '../config/env.js';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res, next) {
    try {
      const user = await AuthService.register(req.body);

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
}
