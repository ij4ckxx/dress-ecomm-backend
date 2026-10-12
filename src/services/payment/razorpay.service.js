import crypto from 'crypto';
import { ENV } from '../../config/env.js';

let razorpayClient = null;
let RazorpayClass = null;

/**
 * Returns active Razorpay SDK client if valid credentials are present
 * @returns {Promise<object|null>}
 */
const getRazorpayClient = async () => {
  if (razorpayClient) return razorpayClient;

  if (
    ENV.RAZORPAY_KEY_ID &&
    ENV.RAZORPAY_KEY_SECRET &&
    !ENV.RAZORPAY_KEY_ID.includes('placeholder')
  ) {
    try {
      if (!RazorpayClass) {
        const mod = await import('razorpay').catch(() => null);
        RazorpayClass = mod?.default || mod;
      }
      if (RazorpayClass) {
        razorpayClient = new RazorpayClass({
          key_id: ENV.RAZORPAY_KEY_ID,
          key_secret: ENV.RAZORPAY_KEY_SECRET,
        });
      }
    } catch (err) {
      console.warn('[RAZORPAY CLIENT WARN]:', err.message);
    }
  }

  return razorpayClient;
};

/**
 * Creates an order with Razorpay or sandbox fallback
 * @param {object} params
 * @param {string} params.orderNumber
 * @param {number} params.amountInRupees
 * @param {string} [params.currency='INR']
 * @returns {Promise<{ orderId: string, keyId: string, amount: number, currency: string }>}
 */
export const createRazorpayOrder = async ({
  orderNumber,
  amountInRupees,
  currency = 'INR',
}) => {
  const amountInPaise = Math.round(Number(amountInRupees) * 100);
  const client = await getRazorpayClient();

  if (client) {
    const rzpOrder = await client.orders.create({
      amount: amountInPaise,
      currency,
      receipt: orderNumber,
      notes: { orderNumber },
    });

    return {
      orderId: rzpOrder.id,
      keyId: ENV.RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency,
    };
  }

  // Development sandbox fallback (when keys are test placeholders)
  const mockRzpOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    orderId: mockRzpOrderId,
    keyId: ENV.RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency,
  };
};

/**
 * Verifies Razorpay payment signature
 * @param {object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @returns {boolean}
 */
export const verifyRazorpayPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  // Allow test / sandbox passes in development if using mock orders
  if (
    ENV.NODE_ENV === 'development' &&
    (razorpayOrderId.startsWith('order_mock_') || razorpaySignature === 'mock_signature_test')
  ) {
    return true;
  }

  if (!ENV.RAZORPAY_KEY_SECRET || ENV.RAZORPAY_KEY_SECRET.includes('placeholder')) {
    // If running in development with no secret set, allow sandbox verification
    return ENV.NODE_ENV === 'development';
  }

  const expectedSignature = crypto
    .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return expectedSignature === razorpaySignature;
};
