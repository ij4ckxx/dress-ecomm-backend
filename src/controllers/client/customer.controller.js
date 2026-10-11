import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getAccountDetailsService,
  updateAccountDetailsService,
  changePasswordService,
} from '../../services/client/customer.service.js';

/**
 * Controller to fetch authenticated customer account details
 * GET /api/v1/customer/account
 * GET /api/customer/account
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
 * PATCH /api/v1/customer/account
 * PATCH /api/customer/account
 */
export const updateAccountDetails = async (req, res, next) => {
  try {
    const updatedAccount = await updateAccountDetailsService(req.user.id, req.body);

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
 * Controller to change authenticated customer password
 * PATCH /api/v1/customer/account/password
 * PATCH /api/customer/account/password
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
