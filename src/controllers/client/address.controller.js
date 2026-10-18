import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  createAddressService,
  getAddressesService,
  getAddressByIdService,
  updateAddressService,
  setDefaultAddressService,
  deleteAddressService,
} from '../../services/client/address.service.js';

/**
 * Creates a new address for the authenticated customer
 * POST /api/v1/customer/addresses
 * POST /api/customer/addresses
 */
export const createAddress = async (req, res, next) => {
  try {
    const address = await createAddressService(req.user.id, req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Address created successfully',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all saved addresses for the authenticated customer
 * GET /api/v1/customer/addresses
 * GET /api/customer/addresses
 */
export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await getAddressesService(req.user.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Addresses fetched successfully',
      data: { addresses },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single address owned by the authenticated customer
 * GET /api/v1/customer/addresses/:addressId
 * GET /api/customer/addresses/:addressId
 */
export const getAddressById = async (req, res, next) => {
  try {
    const address = await getAddressByIdService(req.user.id, req.params.addressId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Address fetched successfully',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an address owned by the authenticated customer
 * PATCH /api/v1/customer/addresses/:addressId
 * PATCH /api/customer/addresses/:addressId
 */
export const updateAddress = async (req, res, next) => {
  try {
    const updatedAddress = await updateAddressService(
      req.user.id,
      req.params.addressId,
      req.body
    );

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Address updated successfully',
      data: { address: updatedAddress },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an address owned by the authenticated customer
 * DELETE /api/v1/customer/addresses/:addressId
 * DELETE /api/customer/addresses/:addressId
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const result = await deleteAddressService(req.user.id, req.params.addressId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sets an existing address as the default address
 * PATCH /api/v1/customer/addresses/:addressId/default
 * PUT /api/v1/customer/addresses/:addressId/default
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const address = await setDefaultAddressService(req.user.id, req.params.addressId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Default address updated successfully',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};
