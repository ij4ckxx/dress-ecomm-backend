import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ROLES } from '../../constants/roles.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Retrieves paginated customer list with calculated LTV and order stats
 */
export const getCustomersService = async ({ query }) => {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 20));
  const {
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isActive,
  } = query || {};

  const skip = (page - 1) * limit;

  const where = {
    role: ROLES.CUSTOMER,
  };

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Fetch customers with their orders summary
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
          select: { city: true, state: true, country: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  // Compute metrics per customer
  let formattedCustomers = users.map((u) => {
    const validOrders = u.orders.filter((o) => o.status !== 'CANCELLED');
    const totalSpent = validOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const ordersCount = u.orders.length;
    const averageOrderValue = validOrders.length > 0 ? Number((totalSpent / validOrders.length).toFixed(2)) : 0;
    const lastOrderDate = u.orders.length > 0 ? u.orders[0].createdAt : null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive,
      ordersCount,
      totalSpent: Number(totalSpent.toFixed(2)),
      averageOrderValue,
      lastOrderDate,
      location: u.addresses[0] ? `${u.addresses[0].city}, ${u.addresses[0].state}` : null,
      createdAt: u.createdAt,
    };
  });

  // Apply custom in-memory sorting for aggregate fields if requested
  if (sortBy === 'totalSpent') {
    formattedCustomers.sort((a, b) => (sortOrder === 'asc' ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent));
  } else if (sortBy === 'orderCount') {
    formattedCustomers.sort((a, b) => (sortOrder === 'asc' ? a.ordersCount - b.ordersCount : b.ordersCount - a.ordersCount));
  } else if (sortBy === 'name') {
    formattedCustomers.sort((a, b) => (sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  } else if (sortBy === 'createdAt') {
    formattedCustomers.sort((a, b) => (sortOrder === 'asc' ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt)));
  }

  const paginated = formattedCustomers.slice(skip, skip + limit);

  return {
    customers: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves full Customer 360 profile with order history and saved addresses
 */
export const getCustomerByIdService = async (customerId) => {
  const customer = await prisma.user.findFirst({
    where: { id: customerId, role: ROLES.CUSTOMER },
    include: {
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          trackingNumber: true,
          courierPartner: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              title: true,
              quantity: true,
              price: true,
              imageUrl: true,
            },
          },
        },
      },
      wishlist: {
        include: {
          items: {
            select: { id: true, productId: true },
          },
        },
      },
    },
  });

  if (!customer) {
    throw createServiceError('Customer not found', HTTP_STATUS.NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }

  // Calculate full lifetime metrics across all historical orders
  const allOrders = await prisma.order.findMany({
    where: { userId: customerId },
    select: { status: true, totalAmount: true },
  });

  let lifetimeValue = 0;
  let completedOrders = 0;
  let pendingOrders = 0;
  let shippedOrders = 0;
  let cancelledOrders = 0;

  for (const o of allOrders) {
    if (o.status !== 'CANCELLED') {
      lifetimeValue += Number(o.totalAmount);
    }
    if (o.status === 'DELIVERED') completedOrders++;
    else if (['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status)) pendingOrders++;
    else if (['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)) shippedOrders++;
    else if (o.status === 'CANCELLED') cancelledOrders++;
  }

  const nonCancelledCount = allOrders.length - cancelledOrders;
  const averageOrderValue = nonCancelledCount > 0 ? Number((lifetimeValue / nonCancelledCount).toFixed(2)) : 0;

  return {
    profile: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      avatarUrl: customer.avatarUrl,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    },
    metrics: {
      lifetimeValue: Number(lifetimeValue.toFixed(2)),
      totalOrders: allOrders.length,
      completedOrders,
      pendingOrders,
      shippedOrders,
      cancelledOrders,
      averageOrderValue,
      wishlistCount: customer.wishlist?.items?.length || 0,
    },
    savedAddresses: customer.addresses,
    recentOrders: customer.orders.map((o) => ({
      ...o,
      itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
    })),
  };
};

/**
 * Creates a new customer account directly from the admin panel
 */
export const createCustomerService = async ({ customerData, adminUser }) => {
  const { name, email, password, phone, avatarUrl, address } = customerData;
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    throw createServiceError(
      'An account with this email address already exists.',
      HTTP_STATUS.CONFLICT,
      'EMAIL_ALREADY_EXISTS'
    );
  }

  // 2. Hash password (or generate random secure password if not provided)
  const plainPassword = password || crypto.randomBytes(12).toString('hex');
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  // 3. Create customer and optional initial address in transaction
  const newCustomer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        avatarUrl: avatarUrl || null,
        role: ROLES.CUSTOMER,
        permissions: [],
        isActive: true,
        createdById: adminUser.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (address) {
      await tx.address.create({
        data: {
          userId: user.id,
          firstName: address.firstName.trim(),
          lastName: address.lastName.trim(),
          company: address.company ? address.company.trim() : null,
          address1: address.address1.trim(),
          address2: address.address2 ? address.address2.trim() : null,
          city: address.city.trim(),
          state: address.state.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country ? address.country.trim() : 'India',
          phoneNumber: address.phoneNumber ? address.phoneNumber.trim() : phone,
          isDefault: true,
        },
      });
    }

    return user;
  });

  return newCustomer;
};

/**
 * Updates customer details from the admin panel
 */
export const updateCustomerService = async ({ customerId, updateData }) => {
  const customer = await prisma.user.findFirst({
    where: { id: customerId, role: ROLES.CUSTOMER },
    select: { id: true, email: true },
  });

  if (!customer) {
    throw createServiceError('Customer not found', HTTP_STATUS.NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }

  const dataToUpdate = {};

  if (updateData.name !== undefined) dataToUpdate.name = updateData.name.trim();
  if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone ? updateData.phone.trim() : null;
  if (updateData.avatarUrl !== undefined) dataToUpdate.avatarUrl = updateData.avatarUrl;
  if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive;

  if (updateData.email !== undefined) {
    const normalizedEmail = updateData.email.toLowerCase().trim();
    if (normalizedEmail !== customer.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (emailExists && emailExists.id !== customerId) {
        throw createServiceError('Email is already taken by another account', HTTP_STATUS.CONFLICT, 'EMAIL_ALREADY_EXISTS');
      }
      dataToUpdate.email = normalizedEmail;
    }
  }

  if (updateData.password) {
    const salt = await bcrypt.genSalt(12);
    dataToUpdate.passwordHash = await bcrypt.hash(updateData.password, salt);
    // Invalidate refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: customerId } });
  }

  const updatedCustomer = await prisma.user.update({
    where: { id: customerId },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updatedCustomer;
};

/**
 * Deletes or deactivates customer account safely
 */
export const deleteCustomerService = async ({ customerId }) => {
  const customer = await prisma.user.findFirst({
    where: { id: customerId, role: ROLES.CUSTOMER },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  if (!customer) {
    throw createServiceError('Customer not found', HTTP_STATUS.NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }

  // If customer has placed orders, deactivate account to preserve order history
  if (customer._count.orders > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: customerId },
        data: { isActive: false },
      });
      await tx.refreshToken.deleteMany({ where: { userId: customerId } });
    });

    return {
      action: 'DEACTIVATED',
      message: `Customer '${customer.name}' has ${customer._count.orders} order(s). Account has been deactivated to preserve order history.`,
      customer: { id: customer.id, name: customer.name, email: customer.email, isActive: false },
    };
  }

  // If customer has no orders, safely hard-delete
  await prisma.$transaction(async (tx) => {
    await tx.user.delete({
      where: { id: customerId },
    });
  });

  return {
    action: 'DELETED',
    message: `Customer '${customer.name}' deleted successfully`,
    customer: { id: customer.id, name: customer.name, email: customer.email },
  };
};
