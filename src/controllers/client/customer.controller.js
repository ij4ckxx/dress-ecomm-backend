import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getAccountDetailsService,
  updateAccountDetailsService,
  updateCustomerAvatarService,
  changePasswordService,
} from '../../services/client/customer.service.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';

/**
 * Controller to fetch authenticated customer account details
 * GET /api/v1/customer/account
 */
export const getAccountDetails = async (req, res, next) => {
  try {
    const account = await getAccountDetailsService(req.user.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Account details fetched successfully',
      data: { account },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update authenticated customer account details
 * Supports direct avatar file upload OR avatarUrl (one only)
 * PATCH /api/v1/customer/account
 */
export const updateAccountDetails = async (req, res, next) => {
  try {
    const hasFile = Boolean(req.file);
    const hasUrl = Boolean(req.body.avatarUrl && typeof req.body.avatarUrl === 'string' && req.body.avatarUrl.trim() !== '');

    if (hasFile && hasUrl) {
      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Conflicting image input: Please provide either an avatar file upload OR an avatar URL, not both.',
        error: {
          code: 'IMAGE_INPUT_CONFLICT',
          details: [{ field: 'avatar', message: 'Cannot accept both an avatar file upload and avatarUrl simultaneously.' }],
        },
      });
    }

    let avatarUrl = req.body.avatarUrl;
    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/avatars');
      avatarUrl = uploaded.url;
    }

    const payload = { ...req.body };
    if (avatarUrl !== undefined) {
      payload.avatarUrl = avatarUrl;
    }

    const updatedAccount = await updateAccountDetailsService(req.user.id, payload);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Account details updated successfully',
      data: { account: updatedAccount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dedicated controller to update avatar only
 * Accepts file upload ('avatar' or 'image') OR 'avatarUrl' in body
 * POST /api/v1/customer/account/avatar
 */
export const updateAvatar = async (req, res, next) => {
  try {
    const hasFile = Boolean(req.file);
    const hasUrl = Boolean(req.body.avatarUrl && typeof req.body.avatarUrl === 'string' && req.body.avatarUrl.trim() !== '');

    if (hasFile && hasUrl) {
      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Conflicting image input: Please provide either an avatar file upload OR an avatar URL, not both.',
        error: {
          code: 'IMAGE_INPUT_CONFLICT',
          details: [{ field: 'avatar', message: 'Cannot accept both an avatar file upload and avatarUrl simultaneously.' }],
        },
      });
    }

    if (!hasFile && !hasUrl) {
      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Please provide either an avatar image file upload or an avatar URL.',
        error: {
          code: 'AVATAR_REQUIRED',
          details: [{ field: 'avatar', message: 'No file or URL was provided.' }],
        },
      });
    }

    let finalAvatarUrl = req.body.avatarUrl;
    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/avatars');
      finalAvatarUrl = uploaded.url;
    }

    const updatedUser = await updateCustomerAvatarService(req.user.id, finalAvatarUrl);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Avatar updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to change authenticated customer password
 * PATCH /api/v1/customer/account/password
 */
export const changePassword = async (req, res, next) => {
  try {
    const result = await changePasswordService(req.user.id, req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
