import {
  createUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  toggleUserStatusService,
  getDelegatablePermissionsService,
} from '../../services/admin/user.service.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Create a new subordinate user with role & permission delegation
 * Accepts direct avatar file upload OR avatarUrl (one only)
 * POST /api/v1/admin/users
 */
export const createUser = async (req, res, next) => {
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

    let avatarUrl = req.body.avatarUrl || null;
    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/avatars');
      avatarUrl = uploaded.url;
    }

    const payload = { ...req.body };
    if (avatarUrl !== undefined) {
      payload.avatarUrl = avatarUrl;
    }

    const newUser = await createUserService({
      creator: req.user,
      userData: payload,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: `${newUser.role} user created successfully`,
      data: { user: newUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated list of users visible to current admin
 * GET /api/v1/admin/users
 */
export const getUsers = async (req, res, next) => {
  try {
    const result = await getUsersService({
      currentUser: req.user,
      query: req.query,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Users fetched successfully',
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user by ID
 * GET /api/v1/admin/users/:id
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await getUserByIdService({
      currentUser: req.user,
      userId: req.params.id,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'User details fetched successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update subordinate user details, avatar, or permissions
 * Accepts direct avatar file upload OR avatarUrl (one only)
 * PUT /api/v1/admin/users/:id
 */
export const updateUser = async (req, res, next) => {
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

    const updatedUser = await updateUserService({
      currentUser: req.user,
      targetUserId: req.params.id,
      updateData: payload,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active/deactivated status
 * PATCH /api/v1/admin/users/:id/status
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const updatedUser = await toggleUserStatusService({
      currentUser: req.user,
      targetUserId: req.params.id,
      isActive,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `User status set to ${updatedUser.isActive ? 'Active' : 'Inactive'}`,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get delegatable permissions for current admin level
 * GET /api/v1/admin/users/permissions/delegatable
 */
export const getAvailablePermissions = async (req, res, next) => {
  try {
    const permissions = getDelegatablePermissionsService(req.user);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Delegatable permissions retrieved',
      data: { permissions },
    });
  } catch (error) {
    next(error);
  }
};
