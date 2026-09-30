import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

/**
 * Generate a short-lived access JWT token
 * @param {object} payload
 * @param {string} payload.id - User ID
 * @param {string} payload.role - User Role (CUSTOMER, ADMIN, etc.)
 * @param {string} [payload.email] - User email
 * @returns {string} Signed JWT access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      sub: payload.id,
      role: payload.role,
      email: payload.email,
    },
    ENV.JWT_ACCESS_SECRET,
    {
      expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
    }
  );
};

/**
 * Generate a cryptographically random refresh token string
 * @returns {string} Raw refresh token
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Create a secure SHA-256 hash of a token for database storage
 * @param {string} token - Raw token
 * @returns {string} Hex hash of token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify an access token
 * @param {string} token
 * @returns {object} Decoded JWT payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET);
};
