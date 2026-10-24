import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { addItemToCart, getCartDetails } from './cart.service.js';
import { sendCustomerOrderCancellationEmail } from '../notification/email.service.js';
import {
  buildOrderTrackingTimeline,
  maskEmail,
  maskPhone,
  maskName,
  maskAddress,
} from '../../utils/orderTimeline.js';

/**
 * Helper to convert numerical values to standard numbers
 * @param {any} val
 * @returns {number}
 */
const toNumber = (val) => Number(val) || 0;

/**
 * Retrieves a compact, paginated list of orders for the authenticated customer
 * @param {object} params
 * @param {string} params.userId
 * @param {object} params.query
 * @returns {Promise<object>}
 */
export const getCustomerOrdersService = async ({ userId, query }) => {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const status = query?.status || 'ALL';

  const where = { userId };
  if (status !== 'ALL') {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        upiReference: true,
        totalAmount: true,
        courierPartner: true,
        trackingNumber: true,
        estimatedDelivery: true,
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
      },
    }),
    prisma.order.count({ where }),
  ]);

  const formattedOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    upiReference: order.upiReference || null,
    totalAmount: toNumber(order.totalAmount),
    itemsCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
    items: order.items.map((item) => ({
      ...item,
      price: toNumber(item.price),
      totalPrice: toNumber(item.totalPrice),
    })),
    courierPartner: order.courierPartner || null,
    trackingNumber: order.trackingNumber || null,
    estimatedDelivery: order.estimatedDelivery || null,
  }));

  return {
    orders: formattedOrders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves complete order details by human-readable orderNumber for the customer
 * Includes line items, pricing breakdown, courier tracking, timeline, and public metafields
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.orderNumber
 * @returns {Promise<object>}
 */
export const getCustomerOrderByNumberService = async ({ userId, orderNumber }) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, brand: true },
          },
          variant: {
            select: { id: true, sku: true },
          },
        },
      },
      payments: {
        select: {
          id: true,
          gateway: true,
          status: true,
          transactionId: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      statusHistory: {
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          comment: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    upiReference: order.upiReference || null,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone || null,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress || order.shippingAddress,
    courierPartner: order.courierPartner || null,
    trackingNumber: order.trackingNumber || null,
    estimatedDelivery: order.estimatedDelivery || null,
    shippedAt: order.shippedAt || null,
    deliveredAt: order.deliveredAt || null,
    cancelledAt: order.cancelledAt || null,
    cancelReason: order.cancelReason || null,
    notes: order.notes || null,
    pricing: {
      subtotal: toNumber(order.subtotal),
      discountAmount: toNumber(order.discountAmount),
      shippingAmount: toNumber(order.shippingAmount),
      taxAmount: toNumber(order.taxAmount),
      totalAmount: toNumber(order.totalAmount),
      currency: 'INR',
    },
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
      sku: item.sku,
      size: item.size || null,
      color: item.color || null,
      imageUrl: item.imageUrl || null,
      price: toNumber(item.price),
      quantity: item.quantity,
      totalPrice: toNumber(item.totalPrice),
      productSlug: item.product?.slug || null,
    })),
    payments: order.payments.map((p) => ({
      ...p,
      amount: toNumber(p.amount),
    })),
    statusHistory: order.statusHistory,
    tracking: buildOrderTrackingTimeline(order, order.statusHistory),
    metafields: (Array.isArray(order.metafields) ? order.metafields : [])
      .filter((m) => m.isPublic !== false)
      .map((m) => ({
        id: m.id,
        namespace: m.namespace,
        key: m.key,
        value: m.value,
        valueType: m.valueType,
        description: m.description || null,
      }))
      .sort((a, b) => (a.namespace || '').localeCompare(b.namespace || '') || (a.key || '').localeCompare(b.key || '')),
  };
};

/**
 * Handles customer-initiated self-cancellation strictly while order is in PENDING status
 * Atomically cancels order, restores garment inventory via RETURN ledgers, and sends notifications
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.orderNumber
 * @param {string} [params.reason]
 * @returns {Promise<object>}
 */
export const customerCancelOrderService = async ({ userId, orderNumber, reason }) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { items: true },
  });

  if (!order) {
    throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  if (order.status === 'CANCELLED') {
    throw new AppError('Order is already cancelled', HTTP_STATUS.BAD_REQUEST, 'ORDER_ALREADY_CANCELLED');
  }

  if (order.status !== 'PENDING') {
    throw new AppError(
      `Only orders in PENDING status can be cancelled directly. This order is currently in ${order.status} status. Please contact support.`,
      HTTP_STATUS.BAD_REQUEST,
      'CANCELLATION_NOT_ALLOWED'
    );
  }

  const cancelReason = reason ? reason.trim() : 'Cancelled by customer';

  const cancelledOrder = await prisma.$transaction(async (tx) => {
    // 1. Mark order as cancelled
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason,
      },
    });

    // 2. Record timeline history
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: 'PENDING',
        newStatus: 'CANCELLED',
        comment: `Self-service cancellation: ${cancelReason}`,
        changedById: userId,
      },
    });

    // 3. Atomically restore inventory units and log RETURN ledger
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

          await tx.inventoryTransaction.create({
            data: {
              variantId: item.variantId,
              productId: variant.productId,
              type: 'RETURN',
              quantityChange: item.quantity,
              previousStock: variant.stockQuantity,
              newStock: newVarStock,
              reason: `Customer Cancelled (#${order.orderNumber}): ${cancelReason}`,
              referenceId: order.orderNumber,
              createdById: userId,
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
              reason: `Customer Cancelled (#${order.orderNumber}): ${cancelReason}`,
              referenceId: order.orderNumber,
              createdById: userId,
            },
          });
        }
      }
    }

    return updated;
  }, { maxWait: 10000, timeout: 30000 });

  // Fire email notifications asynchronously
  sendCustomerOrderCancellationEmail({ order: cancelledOrder, reason: cancelReason }).catch((err) =>
    console.error('[EMAIL DISPATCH ERROR]:', err)
  );

  return cancelledOrder;
};

/**
 * Merges eligible products from a previous order into customer's active cart at current prices
 * Evaluates current catalog availability and stock, reporting skipped or adjusted items
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.orderNumber
 * @returns {Promise<object>}
 */
export const customerReorderService = async ({ userId, orderNumber }) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { items: true },
  });

  if (!order) {
    throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  const addedItems = [];
  const skippedItems = [];

  for (const item of order.items) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });

      if (!product || !product.isActive) {
        skippedItems.push({
          title: item.title,
          sku: item.sku,
          reason: 'Product is no longer available in the catalog',
        });
        continue;
      }

      let selectedVariant = null;
      let availableStock = product.stockQuantity;

      if (item.variantId) {
        selectedVariant = product.variants.find((v) => v.id === item.variantId);
        if (!selectedVariant || !selectedVariant.isActive) {
          skippedItems.push({
            title: item.title,
            sku: item.sku,
            reason: 'Selected size/color variant is no longer available',
          });
          continue;
        }
        availableStock = selectedVariant.stockQuantity;
      }

      if (availableStock <= 0) {
        skippedItems.push({
          title: item.title,
          sku: item.sku,
          reason: 'Item is currently out of stock',
        });
        continue;
      }

      const quantityToAdd = Math.min(item.quantity, availableStock);

      await addItemToCart(
        { userId },
        {
          productId: item.productId,
          variantId: item.variantId,
          quantity: quantityToAdd,
        }
      );

      addedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        sku: item.sku,
        quantityAdded: quantityToAdd,
        originalQuantity: item.quantity,
        note:
          quantityToAdd < item.quantity
            ? `Quantity adjusted from ${item.quantity} to ${quantityToAdd} due to stock limits`
            : undefined,
      });
    } catch (err) {
      skippedItems.push({
        title: item.title,
        sku: item.sku,
        reason: err.message || 'Could not add item to cart',
      });
    }
  }

  // Get refreshed cart state
  const cart = await getCartDetails({ userId });

  return {
    addedItems,
    skippedItems,
    cart,
  };
};

/**
 * Retrieves standalone order tracking details for both authenticated and guest customers
 * @param {object} params
 * @param {string} params.orderNumber
 * @param {string} [params.email]
 * @param {string} [params.phone]
 * @param {string} [params.emailOrPhone]
 * @param {string} [params.userId]
 * @returns {Promise<object>}
 */
export const trackOrderService = async ({ orderNumber, email, phone, emailOrPhone, userId = null }) => {
  if (!orderNumber || typeof orderNumber !== 'string') {
    throw new AppError('Valid order number is required', HTTP_STATUS.BAD_REQUEST, 'ORDER_NUMBER_REQUIRED');
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim() },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, brand: true },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found with the provided details', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  // Determine authorization & authentication state
  const isOwner = Boolean(userId && order.userId === userId);

  // If not logged-in owner, verify email or phone
  if (!isOwner) {
    const candidateEmail = (email || emailOrPhone || '').trim().toLowerCase();
    const candidatePhone = (phone || emailOrPhone || '').replace(/\D/g, '').slice(-10);

    const orderEmail = (order.customerEmail || '').trim().toLowerCase();
    const orderPhone = (order.customerPhone || '').replace(/\D/g, '').slice(-10);

    const hasContactInput = Boolean(candidateEmail || candidatePhone);
    if (!hasContactInput) {
      throw new AppError(
        'Please provide the email address or phone number associated with this order to view tracking details.',
        HTTP_STATUS.UNAUTHORIZED,
        'VERIFICATION_REQUIRED'
      );
    }

    const emailMatches = candidateEmail.includes('@') && orderEmail === candidateEmail;
    const phoneMatches = candidatePhone.length >= 6 && orderPhone && orderPhone.endsWith(candidatePhone);

    if (!emailMatches && !phoneMatches) {
      throw new AppError(
        'Order details could not be verified. Please check the order number and email or phone number entered.',
        HTTP_STATUS.NOT_FOUND,
        'ORDER_VERIFICATION_FAILED'
      );
    }
  }

  const tracking = buildOrderTrackingTimeline(order, order.statusHistory);

  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmount: toNumber(order.totalAmount),
    currency: 'INR',
    itemsCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
      sku: item.sku,
      size: item.size || null,
      color: item.color || null,
      imageUrl: item.imageUrl || null,
      price: toNumber(item.price),
      quantity: item.quantity,
      totalPrice: toNumber(item.totalPrice),
      productSlug: item.product?.slug || null,
    })),
    customer: isOwner
      ? {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone || null,
        }
      : {
          name: maskName(order.customerName),
          email: maskEmail(order.customerEmail),
          phone: maskPhone(order.customerPhone),
        },
    shippingAddress: isOwner
      ? order.shippingAddress
      : maskAddress(order.shippingAddress),
    tracking,
  };
};
