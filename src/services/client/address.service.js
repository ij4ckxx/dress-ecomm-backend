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

    // Check if user currently has ANY default address
    const hasDefault = await tx.address.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });

    const shouldBeDefault = isDefault || existingCount === 0 || !hasDefault;

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
 * Retrieves paginated saved addresses for the authenticated customer
 * Supports page, limit, search, sort, and optional all=true
 * @param {string|object} userIdOrParams - Customer UUID or options object { userId, query }
 * @param {object} [queryParams] - Query parameters { page, limit, search, sort, all }
 * @returns {Promise<{ addresses: Array<object>, pagination: object }>}
 */
export const getAddressesService = async (userIdOrParams, queryParams = {}) => {
  let userId;
  let query = {};

  if (typeof userIdOrParams === 'object' && userIdOrParams !== null) {
    userId = userIdOrParams.userId;
    query = userIdOrParams.query || {};
  } else {
    userId = userIdOrParams;
    query = queryParams || {};
  }

  const isAll = query?.all === true || query?.all === 'true';
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 10));
  const search = query?.search ? String(query.search).trim() : null;
  const sort = query?.sort || 'newest';

  const where = { userId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { address1: { contains: search, mode: 'insensitive' } },
      { address2: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { state: { contains: search, mode: 'insensitive' } },
      { postalCode: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Ordering logic (prioritizes default address, followed by custom sort)
  let orderBy = [{ isDefault: 'desc' }, { createdAt: 'desc' }];
  if (sort === 'oldest') {
    orderBy = [{ isDefault: 'desc' }, { createdAt: 'asc' }];
  } else if (sort === 'city_asc') {
    orderBy = [{ isDefault: 'desc' }, { city: 'asc' }, { createdAt: 'desc' }];
  } else if (sort === 'city_desc') {
    orderBy = [{ isDefault: 'desc' }, { city: 'desc' }, { createdAt: 'desc' }];
  }

  if (isAll) {
    const [addresses, total] = await Promise.all([
      prisma.address.findMany({
        where,
        orderBy,
      }),
      prisma.address.count({ where }),
    ]);

    return {
      addresses,
      pagination: {
        page: 1,
        limit: total || 1,
        total,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  const skip = (page - 1) * limit;

  const [addresses, total] = await Promise.all([
    prisma.address.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.address.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    addresses,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
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
 * Sets an existing address as the default address for the authenticated customer
 * @param {string} userId - Authenticated customer UUID
 * @param {string} addressId - Target address UUID
 * @returns {Promise<object>} Updated address marked as default
 */
export const setDefaultAddressService = async (userId, addressId) => {
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

  if (existingAddress.isDefault) {
    return existingAddress;
  }

  return await prisma.$transaction(async (tx) => {
    // Unset default on all other addresses of this customer
    await tx.address.updateMany({
      where: { userId, id: { not: addressId } },
      data: { isDefault: false },
    });

    // Set target address as default
    const updatedAddress = await tx.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return updatedAddress;
  }, { maxWait: 10000, timeout: 30000 });
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
    // If setting as default, unset default on all other addresses of this user
    if (updateData.isDefault === true) {
      await tx.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
      dataToUpdate.isDefault = true;
    } else if (updateData.isDefault === false && existingAddress.isDefault) {
      // User is attempting to unset default on the current default address
      const otherAddress = await tx.address.findFirst({
        where: { userId, id: { not: addressId } },
        orderBy: { createdAt: 'desc' },
      });

      if (otherAddress) {
        // Promote the next most recent address to default
        await tx.address.update({
          where: { id: otherAddress.id },
          data: { isDefault: true },
        });
        dataToUpdate.isDefault = false;
      } else {
        // If this is the only address, it must remain default
        dataToUpdate.isDefault = true;
      }
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
    } else {
      // Ensure that if other addresses remain, one is guaranteed to be default
      const hasDefault = await tx.address.findFirst({
        where: { userId, isDefault: true },
      });

      if (!hasDefault) {
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
    }
  }, { maxWait: 10000, timeout: 30000 });

  return {
    message: 'Address deleted successfully',
  };
};

