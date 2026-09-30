import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Standardized success response sender
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.statusCode=200]
 * @param {string} [options.message='Success']
 * @param {any} [options.data=null]
 */
export const sendSuccess = (res, { statusCode = HTTP_STATUS.OK, message = 'Success', data = null } = {}) => {
  const payload = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Standardized error response sender
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.statusCode=500]
 * @param {string} [options.message='Internal Server Error']
 * @param {any} [options.error=null]
 */
export const sendError = (res, { statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = 'Internal Server Error', error = null } = {}) => {
  const payload = {
    success: false,
    message,
  };

  if (error !== null && error !== undefined) {
    payload.error = error;
  }

  return res.status(statusCode).json(payload);
};
