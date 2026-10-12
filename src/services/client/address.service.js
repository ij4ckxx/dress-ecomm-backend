import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Creates a new address for the authenticated customer
 * @param {string} userId - Authenticated customer UUID
 * @param {object} addressData - Validated address payload
 * @returns {Promise<object>} Created address
 */
export const createAddressService = async (userId, addressData) => {
  const {
    firstName,
    lastName,
    company,
    address1,
    address2,
    city,
    state,
    postalCode,
    pincode,
    country,
    phoneNumber,
    phone,
    isDefault = false,
  } = addressData;

  const resolvedPostalCode = (postalCode || pincode || '').trim();
  const rawPhone = phoneNumber !== undefined ? phoneNumber : phone;
  const resolvedPhone = rawPhone && String(rawPhone).trim() !== '' ? String(rawPhone).trim() : null;
  const resolvedCompany = company && String(company).trim() !== '' ? String(company).trim() : null;
  const resolvedAddress2 = address2 && String(address2).trim() !== '' ? String(address2).trim() : null;

  return await prisma.$transaction(async (tx) => {
    // Check if this is the customer's first address
    const existingCount = await tx.address.count({
      where: { userId },
    });

    const shouldBeDefault = isDefault || existingCount === 0;

    // If marked as default, unset default flag on all existing addresses
    if (shouldBeDefault && existingCount > 0) {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const createdAddress = await tx.address.create({
      data: {
        userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: resolvedCompany,
        address1: address1.trim(),
        address2: resolvedAddress2,
        city: city.trim(),
        state: state.trim(),
        postalCode: resolvedPostalCode,
        country: country.trim(),
        phoneNumber: resolvedPhone,
        isDefault: shouldBeDefault,
      },
    });

    return createdAddress;
  }, { maxWait: 10000, timeout: 30000 });
};

/**
 * Retrieves all saved addresses for the authenticated customer
 * @param {string} userId - Authenticated customer UUID
 * @returns {Promise<Array<object>>} List of addresses
 */
export const getAddressesService = async (userId) => {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return addresses;
};

/**
 * Retrieves a single address owned by the authenticated customer
 * @param {string} userId - Authenticated customer UUID
 * @param {string} addressId - Target address UUID
 * @returns {Promise<object>} Address record
 */
export const getAddressByIdService = async (userId, addressId) => {
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
    },
  });

  if (!address) {
    throw new AppError(
      'Address not found',
      HTTP_STATUS.NOT_FOUND,
      'ADDRESS_NOT_FOUND'
    );
  }

  return address;
};

/**
 * Updates an existing address owned by the authenticated customer
 * @param {string} userId - Authenticated customer UUID
 * @param {string} addressId - Target address UUID
 * @param {object} updateData - Partial update fields
 * @returns {Promise<object>} Updated address
 */
export const updateAddressService = async (userId, addressId, updateData) => {
  const existingAddress = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
    },
  });

  if (!existingAddress) {
    throw new AppError(
      'Address not found',
      HTTP_STATUS.NOT_FOUND,
      'ADDRESS_NOT_FOUND'
    );
  }

  const dataToUpdate = {};

  if (updateData.firstName !== undefined) dataToUpdate.firstName = updateData.firstName.trim();
  if (updateData.lastName !== undefined) dataToUpdate.lastName = updateData.lastName.trim();
  if (updateData.address1 !== undefined) dataToUpdate.address1 = updateData.address1.trim();
  if (updateData.city !== undefined) dataToUpdate.city = updateData.city.trim();
  if (updateData.state !== undefined) dataToUpdate.state = updateData.state.trim();
  if (updateData.country !== undefined) dataToUpdate.country = updateData.country.trim();

  // Postal code / Pincode
  if (updateData.postalCode !== undefined || updateData.pincode !== undefined) {
    const code = updateData.postalCode || updateData.pincode;
    dataToUpdate.postalCode = String(code).trim();
  }

  // Address line 2
  if (updateData.address2 !== undefined) {
    dataToUpdate.address2 =
      updateData.address2 && String(updateData.address2).trim() !== ''
        ? String(updateData.address2).trim()
        : null;
  }

  // Company
  if (updateData.company !== undefined) {
    dataToUpdate.company =
      updateData.company && String(updateData.company).trim() !== ''
        ? String(updateData.company).trim()
        : null;
  }

  // Phone number
  if (updateData.phoneNumber !== undefined || updateData.phone !== undefined) {
    const rawPhone = updateData.phoneNumber !== undefined ? updateData.phoneNumber : updateData.phone;
    dataToUpdate.phoneNumber =
      rawPhone && String(rawPhone).trim() !== '' ? String(rawPhone).trim() : null;
  }

  return await prisma.$transaction(async (tx) => {
    // If setting as default, unset default on other addresses of this user
    if (updateData.isDefault === true) {
      await tx.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
      dataToUpdate.isDefault = true;
    } else if (updateData.isDefault === false) {
      dataToUpdate.isDefault = false;
    }

    const updatedAddress = await tx.address.update({
      where: { id: addressId },
      data: dataToUpdate,
    });

    return updatedAddress;
  }, { maxWait: 10000, timeout: 30000 });
};

/**
 * Deletes an address owned by the authenticated customer
 * @param {string} userId - Authenticated customer UUID
 * @param {string} addressId - Target address UUID
 * @returns {Promise<{ message: string }>}
 */
export const deleteAddressService = async (userId, addressId) => {
  const existingAddress = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
    },
  });

  if (!existingAddress) {
    throw new AppError(
      'Address not found',
      HTTP_STATUS.NOT_FOUND,
      'ADDRESS_NOT_FOUND'
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({
      where: { id: addressId },
    });

    // If the deleted address was default, promote the latest remaining address to default
    if (existingAddress.isDefault) {
      const remainingAddress = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (remainingAddress) {
        await tx.address.update({
          where: { id: remainingAddress.id },
          data: { isDefault: true },
        });
      }
    }
  }, { maxWait: 10000, timeout: 30000 });

  return {
    message: 'Address deleted successfully',
  };
};
