import crypto from 'crypto';
import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { validateCustomerCoupon } from './coupon.service.js';
import { getStoreSettingsService } from '../admin/settings.service.js';
import { createRazorpayOrder, verifyRazorpayPaymentSignature } from '../payment/razorpay.service.js';
import {
  sendOrderConfirmationEmail,
  sendCodAdminAlertEmail,
} from '../notification/email.service.js';

/**
 * Helper to round numerical amounts to 2 decimal places
 * @param {number} num
 * @returns {number}
 */
const round = (num) => Math.round((Number(num) || 0) * 100) / 100;

/**
 * Generates unique human-readable Order Number (e.g. ORD-20261012-7A3B)
 * @returns {string}
 */
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${randomPart}`;
};

/**
 * Resolves address snapshot from saved ID or inline payload
 * @param {object} params
 * @param {string} params.userId
 * @param {string|null} [params.addressId]
 * @param {object|null} [params.inlineAddress]
 * @returns {Promise<object>} Address snapshot object
 */
export const resolveAddressSnapshot = async ({ userId, addressId = null, inlineAddress = null }) => {
  if (addressId) {
    const saved = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!saved) {
      throw new AppError('Saved address not found', HTTP_STATUS.NOT_FOUND, 'ADDRESS_NOT_FOUND');
    }

    return {
      firstName: saved.firstName,
      lastName: saved.lastName,
      company: saved.company || null,
      address1: saved.address1,
      address2: saved.address2 || null,
      city: saved.city,
      state: saved.state,
      postalCode: saved.postalCode,
      country: saved.country,
      phoneNumber: saved.phoneNumber || null,
    };
  }

  if (inlineAddress) {
    return {
      firstName: inlineAddress.firstName.trim(),
      lastName: inlineAddress.lastName.trim(),
      company: inlineAddress.company ? inlineAddress.company.trim() : null,
      address1: inlineAddress.address1.trim(),
      address2: inlineAddress.address2 ? inlineAddress.address2.trim() : null,
      city: inlineAddress.city.trim(),
      state: inlineAddress.state.trim(),
      postalCode: inlineAddress.postalCode.trim(),
      country: inlineAddress.country ? inlineAddress.country.trim() : 'India',
      phoneNumber: inlineAddress.phoneNumber ? inlineAddress.phoneNumber.trim() : null,
    };
  }

  // Fallback to customer's saved default address if available
  if (userId) {
    const defaultAddress = await prisma.address.findFirst({
      where: { userId, isDefault: true },
    });

    if (defaultAddress) {
      return {
        firstName: defaultAddress.firstName,
        lastName: defaultAddress.lastName,
        company: defaultAddress.company || null,
        address1: defaultAddress.address1,
        address2: defaultAddress.address2 || null,
        city: defaultAddress.city,
        state: defaultAddress.state,
        postalCode: defaultAddress.postalCode,
        country: defaultAddress.country,
        phoneNumber: defaultAddress.phoneNumber || null,
      };
    }
  }

  throw new AppError('Address details are required', HTTP_STATUS.BAD_REQUEST, 'ADDRESS_REQUIRED');
};


/**
 * Evaluates authoritative cart pricing, taxes, shipping, and coupon discounts
 * @param {object} params
 * @param {Array} params.cartItems
 * @param {string|null} [params.couponCode]
 * @param {string|null} [params.userId]
 * @returns {Promise<object>}
 */
export const computeCheckoutPricing = async ({
  cartItems,
  couponCode = null,
  userId = null,
  storeConfig = null,
}) => {
  const config = storeConfig || (await getStoreSettingsService());

  const freeShippingThreshold = Number(config.freeShippingThreshold) || 2999;
  const flatShippingRate = Number(config.flatShippingRate) || 150;
  const taxRate = 0.12; // 12% luxury garment GST

  let subtotal = 0;
  const itemBreakdown = [];

  for (const item of cartItems) {
    const p = item.product;
    const v = item.variant;

    // Determine unit price
    let unitPrice = 0;
    if (v) {
      unitPrice = Number(v.salePrice ?? v.regularPrice ?? p.salePrice ?? p.regularPrice);
    } else {
      unitPrice = Number(p.salePrice ?? p.regularPrice);
    }

    // Modifier delta additions
    let modifierTotal = 0;
    const modifierDetails = [];
    if (item.modifiers && item.modifiers.length > 0) {
      for (const m of item.modifiers) {
        const delta = Number(m.priceDelta || m.modifierOption?.priceDelta || 0);
        modifierTotal += delta;
        modifierDetails.push({
          name: m.modifierOption?.name || '',
          priceDelta: delta,
        });
      }
    }

    const effectiveUnitPrice = round(unitPrice + modifierTotal);
    const lineTotal = round(effectiveUnitPrice * item.quantity);
    subtotal = round(subtotal + lineTotal);

    // Extract variant attributes
    let size = null;
    let color = null;
    if (v?.attributes) {
      for (const a of v.attributes) {
        const attrSlug = a.attributeValue?.attribute?.slug?.toLowerCase();
        if (attrSlug === 'size') size = a.attributeValue.value;
        if (attrSlug === 'color') color = a.attributeValue.value;
      }
    }

    itemBreakdown.push({
      cartItemId: item.id,
      productId: p.id,
      variantId: v?.id || null,
      title: p.name,
      variantName: v?.name || null,
      sku: v?.sku || p.sku || 'SKU-UNKNOWN',
      size,
      color,
      imageUrl: v?.images?.[0]?.url || p.images?.[0]?.url || null,
      unitPrice: effectiveUnitPrice,
      quantity: item.quantity,
      lineTotal,
      modifiers: modifierDetails,
    });
  }

  // Coupon discount
  let appliedCoupon = null;
  let discountAmount = 0;

  if (couponCode && couponCode.trim()) {
    appliedCoupon = await validateCustomerCoupon({
      code: couponCode.trim(),
      subtotal,
      userId,
    });
    discountAmount = appliedCoupon.discountAmount;
  }

  const netTaxableSubtotal = Math.max(0, round(subtotal - discountAmount));

  // Shipping
  const shippingAmount = netTaxableSubtotal >= freeShippingThreshold || netTaxableSubtotal === 0 ? 0 : flatShippingRate;

  // Tax (12% GST)
  const taxAmount = round(netTaxableSubtotal * taxRate);

  // Final Total
  const totalAmount = round(netTaxableSubtotal + shippingAmount + taxAmount);

  return {
    items: itemBreakdown,
    pricing: {
      subtotal,
      discountAmount,
      shippingAmount,
      taxAmount,
      totalAmount,
      currency: config?.currency || 'INR',
      freeShippingThreshold,
    },
    appliedCoupon,
  };
};

/**
 * Retrieves pre-checkout summary with verified pricing and inventory availability
 * @param {object} params
 * @param {string} params.userId
 * @param {string|null} [params.shippingAddressId]
 * @param {object|null} [params.shippingAddress]
 * @param {string|null} [params.couponCode]
 * @returns {Promise<object>}
 */
export const getCheckoutSummary = async ({
  userId,
  shippingAddressId = null,
  shippingAddress = null,
  couponCode = null,
}) => {
  // Find customer cart
  const cart = await prisma.cart.findFirst({
    where: { customerId: userId, status: 'ACTIVE' },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { where: { isThumbnail: true }, take: 1 },
            },
          },
          variant: {
            include: {
              images: { take: 1 },
              attributes: { include: { attributeValue: { include: { attribute: true } } } },
            },
          },
          modifiers: {
            include: { modifierOption: true },
          },
        },
      },
    },
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError('Your cart is empty. Please add items before checking out.', HTTP_STATUS.BAD_REQUEST, 'CART_EMPTY');
  }

  // Stock verification & inventory health check
  for (const item of cart.items) {
    const stock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
    if (stock < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${item.product.name}"${item.variant ? ` (${item.variant.name})` : ''}. Available: ${Math.max(0, stock)}, Requested: ${item.quantity}.`,
        HTTP_STATUS.CONFLICT,
        'INSUFFICIENT_STOCK'
      );
    }
  }

  // Compute pricing
  const calculation = await computeCheckoutPricing({
    cartItems: cart.items,
    couponCode,
    userId,
  });

  // Check shipping address if provided
  let resolvedAddress = null;
  if (shippingAddressId || shippingAddress) {
    resolvedAddress = await resolveAddressSnapshot({
      userId,
      addressId: shippingAddressId,
      inlineAddress: shippingAddress,
    });
  }

  return {
    cartId: cart.id,
    items: calculation.items,
    pricing: calculation.pricing,
    appliedCoupon: calculation.appliedCoupon,
    shippingAddress: resolvedAddress,
    isStockAvailable: true,
  };
};

/**
 * Places customer order with atomic inventory deduction and payment intent creation
 * @param {object} params
 * @param {string} params.userId
 * @param {object} params.payload
 * @returns {Promise<object>} Created order + payment payload
 */
export const placeOrder = async ({ userId, payload }) => {
  const {
    shippingAddressId,
    shippingAddress,
    billingAddressSameAsShipping = true,
    billingAddress,
    paymentMethod,
    couponCode = null,
    customerNotes = null,
  } = payload;

  // 1. Fetch authenticated customer record
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new AppError('Customer account not found or deactivated', HTTP_STATUS.UNAUTHORIZED, 'USER_NOT_FOUND');
  }

  // 2. Resolve Shipping & Billing Addresses
  const shippingSnapshot = await resolveAddressSnapshot({
    userId,
    addressId: shippingAddressId,
    inlineAddress: shippingAddress,
  });

  let billingSnapshot = shippingSnapshot;
  if (!billingAddressSameAsShipping && billingAddress) {
    billingSnapshot = await resolveAddressSnapshot({
      userId,
      inlineAddress: billingAddress,
    });
  }

  // COD Contact Validation
  const customerPhone = shippingSnapshot.phoneNumber || user.phone;
  if (paymentMethod === 'COD' && (!customerPhone || !customerPhone.trim())) {
    throw new AppError(
      'A valid contact phone number is required for Cash on Delivery orders',
      HTTP_STATUS.BAD_REQUEST,
      'PHONE_REQUIRED_FOR_COD'
    );
  }

  const orderNumber = generateOrderNumber();
  const storeConfig = await getStoreSettingsService();

  // 3. Execute Order Creation within an Atomic Prisma Transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    // A. Fetch current active customer cart
    const cart = await tx.cart.findFirst({
      where: { customerId: userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            product: { include: { images: { where: { isThumbnail: true }, take: 1 } } },
            variant: {
              include: {
                images: { take: 1 },
                attributes: { include: { attributeValue: { include: { attribute: true } } } },
              },
            },
            modifiers: { include: { modifierOption: true } },
          },
        },
      },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new AppError('Your cart is empty', HTTP_STATUS.BAD_REQUEST, 'CART_EMPTY');
    }

    // B. Verify stock & atomically decrement inventory
    for (const item of cart.items) {
      if (item.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, stockQuantity: true, name: true, sku: true },
        });

        if (!variant || variant.stockQuantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for variant "${variant?.name || item.variantId}". Available: ${variant?.stockQuantity ?? 0}`,
            HTTP_STATUS.CONFLICT,
            'INSUFFICIENT_STOCK'
          );
        }

        const newVarStock = variant.stockQuantity - item.quantity;
        // Deduct variant stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: newVarStock },
        });

        // Record inventory ledger
        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            productId: item.productId,
            type: 'SALE',
            quantityChange: -item.quantity,
            previousStock: variant.stockQuantity,
            newStock: newVarStock,
            reason: `Customer order ${orderNumber}`,
            referenceId: orderNumber,
          },
        });
      } else {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, stockQuantity: true, name: true, sku: true },
        });

        if (!product || product.stockQuantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product?.name}". Available: ${product?.stockQuantity ?? 0}`,
            HTTP_STATUS.CONFLICT,
            'INSUFFICIENT_STOCK'
          );
        }

        const newProdStock = product.stockQuantity - item.quantity;
        // Deduct base product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newProdStock },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantityChange: -item.quantity,
            previousStock: product.stockQuantity,
            newStock: newProdStock,
            reason: `Customer order ${orderNumber}`,
            referenceId: orderNumber,
          },
        });
      }
    }

    // C. Authoritatively calculate totals
    const calculation = await computeCheckoutPricing({
      cartItems: cart.items,
      couponCode,
      userId,
      storeConfig,
    });

    // COD Ceiling Check (Max ₹25,000 for COD)
    if (paymentMethod === 'COD' && calculation.pricing.totalAmount > 25000) {
      throw new AppError(
        'Cash on Delivery is limited to orders up to ₹25,000. Please select Razorpay for higher value orders.',
        HTTP_STATUS.BAD_REQUEST,
        'COD_AMOUNT_EXCEEDED'
      );
    }

    // D. Prepare Order Metafields from Cart Metafields
    const cartMetafields = Array.isArray(cart.metafields) ? cart.metafields : [];
    const orderMetafields = cartMetafields
      .filter((m) => !['price', 'paymentstatus', 'status', 'total'].includes((m.key || '').toLowerCase()))
      .map((m) => ({
        id: crypto.randomUUID(),
        namespace: m.namespace,
        key: m.key,
        value: m.value,
        valueType: m.valueType || 'STRING',
        description: null,
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    // E. Create Order Record with Embedded Metafields
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        customerName: `${shippingSnapshot.firstName} ${shippingSnapshot.lastName}`.trim() || user.name,
        customerEmail: user.email,
        customerPhone,
        subtotal: calculation.pricing.subtotal,
        discountAmount: calculation.pricing.discountAmount,
        shippingAmount: calculation.pricing.shippingAmount,
        taxAmount: calculation.pricing.taxAmount,
        totalAmount: calculation.pricing.totalAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod,
        shippingAddress: shippingSnapshot,
        billingAddress: billingSnapshot,
        notes: customerNotes,
        metafields: orderMetafields,
        items: {
          create: calculation.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            sku: item.sku,
            size: item.size,
            color: item.color,
            imageUrl: item.imageUrl,
            price: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.lineTotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });


    // F. Record Coupon Usage (if applied)
    if (calculation.appliedCoupon) {
      await tx.couponUsage.create({
        data: {
          couponId: (await tx.coupon.findUnique({ where: { code: calculation.appliedCoupon.code } })).id,
          orderId: order.id,
          userId,
          discountApplied: calculation.appliedCoupon.discountAmount,
        },
      });

      await tx.coupon.update({
        where: { code: calculation.appliedCoupon.code },
        data: { usedCount: { increment: 1 } },
      });
    }

    // F. Record Initial Status History
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        newStatus: 'PENDING',
        comment: paymentMethod === 'COD' ? 'Order placed via Cash on Delivery' : 'Order placed, awaiting Razorpay payment verification',
      },
    });

    // G. Create Initial Payment Record
    await tx.payment.create({
      data: {
        orderId: order.id,
        gateway: paymentMethod,
        amount: calculation.pricing.totalAmount,
        currency: calculation.pricing.currency,
        status: 'PENDING',
      },
    });

    // H. Clear Customer Cart Items
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return order;
  }, { maxWait: 10000, timeout: 30000 });

  // 4. Post-Transaction Gateway & Notification Triggers
  if (paymentMethod === 'RAZORPAY') {
    const razorpayData = await createRazorpayOrder({
      orderNumber: createdOrder.orderNumber,
      amountInRupees: Number(createdOrder.totalAmount),
    });

    // Update payment record with razorpay order ID
    await prisma.payment.updateMany({
      where: { orderId: createdOrder.id },
      data: { transactionId: razorpayData.orderId },
    });

    return {
      order: createdOrder,
      razorpay: razorpayData,
    };
  }

  if (paymentMethod === 'COD') {
    // Asynchronously dispatch notifications
    sendCodAdminAlertEmail({ order: createdOrder }).catch((e) => console.error(e));
    sendOrderConfirmationEmail({ order: createdOrder }).catch((e) => console.error(e));

    return {
      order: createdOrder,
    };
  }

  return { order: createdOrder };
};

/**
 * Verifies Razorpay payment signature and transitions order to CONFIRMED
 * @param {object} params
 * @param {string} params.userId
 * @param {object} params.payload
 * @returns {Promise<object>} Confirmed order
 */
export const verifyPayment = async ({ userId, payload }) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;

  const isValid = verifyRazorpayPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    throw new AppError('Payment signature verification failed', HTTP_STATUS.BAD_REQUEST, 'PAYMENT_VERIFICATION_FAILED');
  }

  // Find order
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });

  if (!order) {
    throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'PENDING') {
    return { verified: true, order };
  }

  // Update order and payment status
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const confirmed = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
      },
      include: { items: true },
    });

    await tx.payment.updateMany({
      where: { orderId },
      data: {
        status: 'COMPLETED',
        transactionId: razorpayPaymentId,
        rawResponseJson: { razorpayOrderId, razorpayPaymentId },
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus: 'PENDING',
        newStatus: 'CONFIRMED',
        comment: `Payment verified successfully via Razorpay (Payment ID: ${razorpayPaymentId})`,
      },
    });

    return confirmed;
  }, { maxWait: 10000, timeout: 30000 });

  // Send confirmed email
  sendOrderConfirmationEmail({ order: updatedOrder }).catch((e) => console.error(e));

  return {
    verified: true,
    order: updatedOrder,
  };
};

/**
 * Fetches order confirmation view by orderNumber for post-checkout screen
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.orderNumber
 * @returns {Promise<object>}
 */
export const getOrderConfirmationByNumber = async ({ userId, orderNumber }) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: {
      items: true,
      payments: {
        select: { gateway: true, status: true, transactionId: true, amount: true },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  const publicMetafields = (Array.isArray(order.metafields) ? order.metafields : [])
    .filter((m) => m.isPublic !== false)
    .map((m) => ({
      namespace: m.namespace,
      key: m.key,
      value: m.value,
      valueType: m.valueType,
      description: m.description || null,
    }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    courierPartner: order.courierPartner || null,
    trackingNumber: order.trackingNumber || null,
    estimatedDelivery: order.estimatedDelivery || null,
    items: order.items,
    pricing: {
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingAmount: Number(order.shippingAmount),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
      currency: 'INR',
    },
    payments: order.payments,
    metafields: publicMetafields,
    createdAt: order.createdAt,
  };
};
