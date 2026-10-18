import {
  getCustomersService,
  getCustomerByIdService,
  createCustomerService,
  updateCustomerService,
  deleteCustomerService,
} from '../../services/admin/customer.service.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Get paginated customers list with LTV and order stats
 * GET /api/v1/admin/customers
 */
export const getCustomers = async (req, res, next) => {
  try {
    const result = await getCustomersService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Customers fetched successfully',
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single customer 360 profile with orders, metrics, and saved addresses
 * GET /api/v1/admin/customers/:id
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await getCustomerByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Customer 360 profile fetched successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new customer from the admin dashboard
 * POST /api/v1/admin/customers
 */
export const createCustomer = async (req, res, next) => {
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

    const newCustomer = await createCustomerService({
      customerData: payload,
      adminUser: req.user,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Customer account created successfully',
      data: { customer: newCustomer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing customer profile
 * PUT /api/v1/admin/customers/:id
 */
export const updateCustomer = async (req, res, next) => {
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

    const updatedCustomer = await updateCustomerService({
      customerId: req.params.id,
      updateData: payload,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Customer profile updated successfully',
      data: { customer: updatedCustomer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete or deactivate customer account
 * DELETE /api/v1/admin/customers/:id
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const result = await deleteCustomerService({
      customerId: req.params.id,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: result.customer,
    });
  } catch (error) {
    next(error);
  }
};
