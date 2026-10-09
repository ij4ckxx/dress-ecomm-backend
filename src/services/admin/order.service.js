import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { Parser } from 'json2csv';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

// Formal Order Fulfillment State Machine
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Retrieves paginated orders with rich filters and fulfillment summary counters
 */
export const getOrdersService = async ({ query }) => {
  const {
    page = 1,
    limit = 20,
    search,
    status = 'ALL',
    paymentStatus = 'ALL',
    paymentMethod = 'ALL',
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sort = 'newest',
  } = query;

  const skip = (page - 1) * limit;
  const where = {};

  if (status !== 'ALL') {
    where.status = status;
  }

  if (paymentStatus !== 'ALL') {
    where.paymentStatus = paymentStatus;
  }

  if (paymentMethod !== 'ALL') {
    where.paymentMethod = paymentMethod;
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.totalAmount = {};
    if (minAmount !== undefined) where.totalAmount.gte = minAmount;
    if (maxAmount !== undefined) where.totalAmount.lte = maxAmount;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search, mode: 'insensitive' } },
      { trackingNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Sorting logic
  let orderBy = { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  if (sort === 'total_asc') orderBy = { totalAmount: 'asc' };
  if (sort === 'total_desc') orderBy = { totalAmount: 'desc' };

  const [orders, total, allOrdersSummary] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        items: {
          select: {
            id: true,
            title: true,
            sku: true,
            size: true,
            color: true,
            quantity: true,
            price: true,
            totalPrice: true,
            imageUrl: true,
          },
        },
        payments: {
          select: { id: true, gateway: true, status: true, transactionId: true, amount: true },
          take: 1,
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.findMany({
      select: { status: true, totalAmount: true, paymentStatus: true },
    }),
  ]);

  // Aggregate warehouse fulfillment counters
  let totalRevenue = 0;
  let pendingCount = 0;
  let confirmedCount = 0;
  let processingCount = 0;
  let packedCount = 0;
  let shippedCount = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;

  for (const o of allOrdersSummary) {
    if (o.paymentStatus === 'COMPLETED') {
      totalRevenue += Number(o.totalAmount);
    }
    if (o.status === 'PENDING') pendingCount++;
    if (o.status === 'CONFIRMED') confirmedCount++;
    if (o.status === 'PROCESSING') processingCount++;
    if (o.status === 'PACKED') packedCount++;
    if (o.status === 'SHIPPED' || o.status === 'OUT_FOR_DELIVERY') shippedCount++;
    if (o.status === 'DELIVERED') deliveredCount++;
    if (o.status === 'CANCELLED') cancelledCount++;
  }

  return {
    orders: orders.map((o) => ({
      ...o,
      itemsCount: o.items.reduce((acc, item) => acc + item.quantity, 0),
    })),
    summary: {
      totalOrders: allOrdersSummary.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      pendingCount,
      confirmedCount,
      processingCount,
      packedCount,
      shippedCount,
      deliveredCount,
      cancelledCount,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves full order breakdown with items, customer details, addresses, and status history
 */
export const getOrderByIdService = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, role: true, avatarUrl: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, brand: true },
          },
          variant: {
            select: { id: true, sku: true, stockQuantity: true },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: {
          changedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
    },
  });

  if (!order) {
    throw createServiceError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  return order;
};

/**
 * Advances order status through state machine with audit comment
 */
export const updateOrderStatusService = async ({ orderId, adminUser, statusData }) => {
  const { status: newStatus, comment } = statusData;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createServiceError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  const currentStatus = order.status;

  if (currentStatus === newStatus) {
    throw createServiceError(
      `Order is already in ${newStatus} status`,
      HTTP_STATUS.BAD_REQUEST,
      'STATUS_UNCHANGED'
    );
  }

  // Check state machine rule (unless SUPER_ADMIN override)
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus) && adminUser.role !== 'SUPER_ADMIN') {
    throw createServiceError(
      `Illegal transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'None'}`,
      HTTP_STATUS.BAD_REQUEST,
      'ILLEGAL_STATUS_TRANSITION'
    );
  }

  const updateData = { status: newStatus };
  if (newStatus === 'SHIPPED' && !order.shippedAt) {
    updateData.shippedAt = new Date();
  }
  if (newStatus === 'DELIVERED' && !order.deliveredAt) {
    updateData.deliveredAt = new Date();
  }
  if (newStatus === 'CANCELLED' && !order.cancelledAt) {
    updateData.cancelledAt = new Date();
    updateData.cancelReason = comment || 'Cancelled by Store Admin';
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus: currentStatus,
        newStatus,
        comment: comment || `Status advanced to ${newStatus}`,
        changedById: adminUser.id,
      },
    });

    return updated;
  });

  return updatedOrder;
};

/**
 * Assigns courier tracking credentials and sets status to SHIPPED
 */
export const updateOrderShippingService = async ({ orderId, adminUser, shippingData }) => {
  const { courierPartner, trackingNumber, estimatedDelivery, status = 'SHIPPED', notes } = shippingData;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createServiceError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  const previousStatus = order.status;
  const now = new Date();

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        courierPartner,
        trackingNumber,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        status,
        shippedAt: order.shippedAt || now,
        notes: notes !== undefined ? notes : order.notes,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus,
        newStatus: status,
        comment: `Dispatched via ${courierPartner} (AWB: ${trackingNumber})`,
        changedById: adminUser.id,
      },
    });

    return updated;
  });

  return updatedOrder;
};

/**
 * Updates private internal staff notes on an order
 */
export const updateOrderNotesService = async ({ orderId, notesData }) => {
  const { internalAdminNotes } = notesData;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createServiceError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { internalAdminNotes },
  });

  return updated;
};

/**
 * Cancels an order with mandatory reason and restores inventory safely
 */
export const cancelOrderService = async ({ orderId, adminUser, cancelData }) => {
  const { reason } = cancelData;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw createServiceError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  if (order.status === 'CANCELLED') {
    throw createServiceError('Order is already cancelled', HTTP_STATUS.BAD_REQUEST, 'ORDER_ALREADY_CANCELLED');
  }

  if (order.status === 'DELIVERED') {
    throw createServiceError('Cannot cancel an order that has already been delivered', HTTP_STATUS.BAD_REQUEST, 'ORDER_DELIVERED');
  }

  const previousStatus = order.status;

  const cancelledOrder = await prisma.$transaction(async (tx) => {
    // 1. Update order status to CANCELLED
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    // 2. Add Status History
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus,
        newStatus: 'CANCELLED',
        comment: `Order cancelled: ${reason}`,
        changedById: adminUser.id,
      },
    });

    // 3. Revert inventory units for each garment item
    for (const item of order.items) {
      if (item.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stockQuantity: true, productId: true },
        });

        if (variant) {
          const newVarStock = variant.stockQuantity + item.quantity;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: newVarStock },
          });

          // Recalculate parent product total stock
          const allVariants = await tx.productVariant.findMany({
            where: { productId: variant.productId },
            select: { stockQuantity: true },
          });
          const productStock = allVariants.reduce((s, v) => s + v.stockQuantity, 0);
          await tx.product.update({
            where: { id: variant.productId },
            data: { stockQuantity: productStock },
          });

          // Log Return audit in InventoryTransaction
          await tx.inventoryTransaction.create({
            data: {
              variantId: item.variantId,
              productId: variant.productId,
              type: 'RETURN',
              quantityChange: item.quantity,
              previousStock: variant.stockQuantity,
              newStock: newVarStock,
              reason: `Order Cancelled (#${order.orderNumber}): ${reason}`,
              referenceId: order.orderNumber,
              createdById: adminUser.id,
            },
          });
        }
      } else if (item.productId) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });

        if (product) {
          const newProdStock = product.stockQuantity + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newProdStock },
          });

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantityChange: item.quantity,
              previousStock: product.stockQuantity,
              newStock: newProdStock,
              reason: `Order Cancelled (#${order.orderNumber}): ${reason}`,
              referenceId: order.orderNumber,
              createdById: adminUser.id,
            },
          });
        }
      }
    }

    return updated;
  });

  return cancelledOrder;
};

/**
 * Generates ready-to-print packing slips and courier manifest CSV
 */
export const exportOrdersCsvService = async ({ query }) => {
  const { status, paymentStatus, startDate, endDate } = query;
  const where = {};

  if (status && status !== 'ALL') where.status = status;
  if (paymentStatus && paymentStatus !== 'ALL') where.paymentStatus = paymentStatus;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
    },
  });

  const rows = orders.map((o) => {
    let addressStr = '';
    let city = '';
    let postalCode = '';
    if (typeof o.shippingAddress === 'object' && o.shippingAddress !== null) {
      const addr = o.shippingAddress;
      addressStr = `${addr.street || ''}, ${addr.landmark || ''}`.trim();
      city = addr.city || '';
      postalCode = addr.postalCode || '';
    }

    const itemsSummary = o.items
      .map((item) => `${item.title} (${item.size || 'N/A'}/${item.color || 'N/A'}) x${item.quantity}`)
      .join('; ');

    return {
      'Order Number': o.orderNumber,
      'Order Date': o.createdAt.toISOString().split('T')[0],
      'Customer Name': o.customerName,
      'Customer Email': o.customerEmail,
      'Customer Phone': o.customerPhone || 'N/A',
      'Address': addressStr,
      'City': city,
      'Postal Code': postalCode,
      'Order Status': o.status,
      'Payment Status': o.paymentStatus,
      'Payment Method': o.paymentMethod,
      'Items': itemsSummary,
      'Total Units': o.items.reduce((s, i) => s + i.quantity, 0),
      'Total Amount (INR)': Number(o.totalAmount),
      'Courier Partner': o.courierPartner || 'Unassigned',
      'Tracking Number': o.trackingNumber || 'Unassigned',
    };
  });

  const parser = new Parser();
  const csv = parser.parse(rows);
  return csv;
};
