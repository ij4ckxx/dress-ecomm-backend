import {
  createUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  toggleUserStatusService,
  getAvailablePermissionsService,
} from '../../services/admin/user.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Create a new user with hierarchy enforcement
 * POST /api/v1/admin/users
 */
export const createUser = async (req, res, next) => {
  try {
    const newUser = await createUserService({
      creator: req.user,
      userData: req.body,
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
 * Update subordinate user details or permissions
 * PUT /api/v1/admin/users/:id
 */
export const updateUser = async (req, res, next) => {
  try {
    const updatedUser = await updateUserService({
      currentUser: req.user,
      targetUserId: req.params.id,
      updateData: req.body,
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
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of permissions the current admin can assign to subordinates
 * GET /api/v1/admin/users/permissions/delegatable
 */
export const getAvailablePermissions = async (req, res, next) => {
  try {
    const delegatablePermissions = getAvailablePermissionsService(req.user);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Delegatable permissions fetched successfully',
      data: { permissions: delegatablePermissions },
    });
  } catch (error) {
    next(error);
  }
};
