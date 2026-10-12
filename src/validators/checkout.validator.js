import { z } from 'zod';

const addressSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  company: z.string().trim().max(100).optional().nullable(),
  address1: z.string().trim().min(3, 'Address line 1 is required').max(150),
  address2: z.string().trim().max(150).optional().nullable(),
  city: z.string().trim().min(2, 'City is required').max(60),
  state: z.string().trim().min(2, 'State is required').max(60),
  postalCode: z.string().trim().min(3, 'Postal code is required').max(20),
  country: z.string().trim().default('India'),
  phoneNumber: z.string().trim().min(7, 'Phone number must be at least 7 digits').max(20),
});

export const checkoutSummarySchema = z.object({
  shippingAddressId: z.string().uuid().optional().nullable(),
  shippingAddress: addressSchema.optional().nullable(),
  couponCode: z.string().trim().optional().nullable(),
});

export const placeOrderSchema = z
  .object({
    shippingAddressId: z.string().uuid().optional().nullable(),
    shippingAddress: addressSchema.optional().nullable(),
    billingAddressSameAsShipping: z.boolean().default(true),
    billingAddress: addressSchema.optional().nullable(),
    paymentMethod: z.enum(['RAZORPAY', 'COD'], {
      required_error: 'Payment method is required (RAZORPAY or COD)',
    }),
    couponCode: z.string().trim().optional().nullable(),
    customerNotes: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      // Must provide either shippingAddressId or inline shippingAddress
      return Boolean(data.shippingAddressId || data.shippingAddress);
    },
    {
      message: 'Please provide either a saved shippingAddressId or complete shippingAddress details',
      path: ['shippingAddress'],
    }
  );

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});

export const orderNumberParamSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
});
