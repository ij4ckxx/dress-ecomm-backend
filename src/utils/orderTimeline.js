/**
 * Utility to construct human-friendly, frontend-ready tracking timelines
 * for both customer storefront and admin dashboard.
 */

export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email || null;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
};

export const maskPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `******${digits.slice(-4)}`;
};

export const maskName = (name) => {
  if (!name) return 'Customer';
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => (p.length <= 2 ? p : `${p[0]}***${p[p.length - 1]}`)).join(' ');
};

export const maskAddress = (address) => {
  if (!address || typeof address !== 'object') return null;
  return {
    city: address.city || null,
    state: address.state || null,
    postalCode: address.postalCode || null,
    country: address.country || 'India',
  };
};

/**
 * Maps raw order statuses to human-readable titles and descriptions
 */
export const STATUS_LABELS = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Processing & Tailoring',
  PACKED: 'Packed & Ready',
  SHIPPED: 'Dispatched / In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return Requested',
  RETURNED: 'Returned to Warehouse',
  REFUNDED: 'Refunded',
};

/**
 * Builds standard 5-step progress bar and timeline checkpoints
 *
 * @param {object} order - Raw Prisma Order object
 * @param {Array} [statusHistory=[]] - OrderStatusHistory records
 * @returns {object} Standardized tracking object
 */
export const buildOrderTrackingTimeline = (order, statusHistory = []) => {
  const currentStatus = order.status;
  const isCancelled = currentStatus === 'CANCELLED';
  const isReturn = ['RETURN_REQUESTED', 'RETURNED', 'REFUNDED'].includes(currentStatus);
  const isDelivered = currentStatus === 'DELIVERED';

  // Build a timestamp lookup map from history
  const statusTimes = {};
  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const h of sortedHistory) {
    if (h.newStatus && !statusTimes[h.newStatus]) {
      statusTimes[h.newStatus] = h.createdAt;
    }
  }

  // Determine current progression index (1 to 5)
  let currentStep = 1;
  if (isCancelled) {
    currentStep = 0;
  } else if (isDelivered) {
    currentStep = 5;
  } else if (currentStatus === 'OUT_FOR_DELIVERY') {
    currentStep = 4;
  } else if (currentStatus === 'SHIPPED') {
    currentStep = 3;
  } else if (['CONFIRMED', 'PROCESSING', 'PACKED'].includes(currentStatus)) {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  // Step 1: Order Placed
  const step1Time = order.createdAt;

  // Step 2: Order Confirmed
  const step2Time =
    statusTimes['CONFIRMED'] ||
    statusTimes['PROCESSING'] ||
    statusTimes['PACKED'] ||
    (order.paymentStatus === 'COMPLETED' ? order.createdAt : null);

  // Step 3: Shipped
  const step3Time = order.shippedAt || statusTimes['SHIPPED'] || null;

  // Step 4: Out for Delivery
  const step4Time = statusTimes['OUT_FOR_DELIVERY'] || null;

  // Step 5: Delivered
  const step5Time = order.deliveredAt || statusTimes['DELIVERED'] || null;

  // Construct 5 Canonical Steps for Storefront UI
  const steps = [
    {
      step: 1,
      key: 'ORDER_PLACED',
      title: 'Order Placed',
      description: 'Your order has been received and verified by our system.',
      isCompleted: !isCancelled && currentStep >= 1,
      isCurrent: !isCancelled && currentStep === 1,
      timestamp: step1Time,
    },
    {
      step: 2,
      key: 'ORDER_CONFIRMED',
      title: 'Order Confirmed',
      description: 'Order confirmed and transferred to atelier for tailoring, finishing & packing.',
      isCompleted: !isCancelled && currentStep >= 2,
      isCurrent: !isCancelled && currentStep === 2,
      timestamp: step2Time,
    },
    {
      step: 3,
      key: 'SHIPPED',
      title: 'Dispatched & In Transit',
      description:
        order.courierPartner && order.trackingNumber
          ? `Dispatched via ${order.courierPartner} (AWB: ${order.trackingNumber}).`
          : 'Package dispatched from warehouse with courier partner.',
      isCompleted: !isCancelled && currentStep >= 3,
      isCurrent: !isCancelled && currentStep === 3,
      timestamp: step3Time,
    },
    {
      step: 4,
      key: 'OUT_FOR_DELIVERY',
      title: 'Out for Delivery',
      description: 'Courier executive is out for delivery to your shipping address today.',
      isCompleted: !isCancelled && currentStep >= 4,
      isCurrent: !isCancelled && currentStep === 4,
      timestamp: step4Time,
    },
    {
      step: 5,
      key: 'DELIVERED',
      title: 'Delivered',
      description: 'Package delivered to recipient.',
      isCompleted: isDelivered,
      isCurrent: isDelivered,
      timestamp: step5Time,
    },
  ];

  // Map detailed timeline events / checkpoints
  const checkpoints = sortedHistory.map((h) => ({
    id: h.id,
    status: h.newStatus,
    statusLabel: STATUS_LABELS[h.newStatus] || h.newStatus,
    comment: h.comment || `Status updated to ${STATUS_LABELS[h.newStatus] || h.newStatus}`,
    timestamp: h.createdAt,
  }));

  // If no history exists yet, prepend the order placement
  if (checkpoints.length === 0) {
    checkpoints.push({
      id: 'initial',
      status: 'PENDING',
      statusLabel: 'Order Placed',
      comment: 'Order placed successfully by customer',
      timestamp: order.createdAt,
    });
  }

  return {
    status: currentStatus,
    statusLabel: STATUS_LABELS[currentStatus] || currentStatus,
    currentStep,
    totalSteps: 5,
    isDelivered,
    isCancelled,
    isReturn,
    cancelReason: order.cancelReason || null,
    cancelledAt: order.cancelledAt || null,
    courierPartner: order.courierPartner || null,
    trackingNumber: order.trackingNumber || null,
    estimatedDelivery: order.estimatedDelivery || null,
    shippedAt: order.shippedAt || null,
    deliveredAt: order.deliveredAt || null,
    steps,
    checkpoints,
  };
};
