import { z } from 'zod';
import { CART_LIMITS, METAFIELD_VALUE_TYPE } from '../constants/cart.constants.js';

const metafieldValueTypeEnum = z.enum([
  METAFIELD_VALUE_TYPE.STRING,
  METAFIELD_VALUE_TYPE.NUMBER,
  METAFIELD_VALUE_TYPE.BOOLEAN,
  METAFIELD_VALUE_TYPE.JSON,
]);

/**
 * Validates metafield value according to its declared type
 */
export const validateMetafieldValue = (value, valueType) => {
  if (valueType === METAFIELD_VALUE_TYPE.NUMBER) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Metafield value "${value}" is not a valid number`);
    }
  } else if (valueType === METAFIELD_VALUE_TYPE.BOOLEAN) {
    const lower = String(value).toLowerCase().trim();
    if (lower !== 'true' && lower !== 'false' && lower !== '0' && lower !== '1') {
      throw new Error(`Metafield value "${value}" is not a valid boolean ('true' or 'false')`);
    }
  } else if (valueType === METAFIELD_VALUE_TYPE.JSON) {
    try {
      JSON.parse(value);
    } catch {
      throw new Error(`Metafield value is not valid JSON`);
    }
  }
};

export const cartIdParamSchema = z.object({
  cartId: z.string().trim().min(1, 'Cart ID is required'),
});

export const cartOptionalIdParamSchema = z.object({
  cartId: z.string().trim().optional(),
});

export const cartItemIdParamsSchema = z.object({
  cartId: z.string().trim().optional(),
  itemId: z.string().uuid('Invalid cart item ID'),
});

export const addCartItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID').nullable().optional(),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(CART_LIMITS.MIN_QUANTITY, `Quantity must be at least ${CART_LIMITS.MIN_QUANTITY}`)
    .max(CART_LIMITS.MAX_QUANTITY_PER_ITEM, `Quantity cannot exceed ${CART_LIMITS.MAX_QUANTITY_PER_ITEM}`)
    .default(1),
  modifierOptionIds: z.array(z.string().uuid('Invalid modifier option ID')).optional().default([]),
  metafields: z
    .array(
      z.object({
        namespace: z
          .string()
          .trim()
          .min(1, 'Namespace is required')
          .max(CART_LIMITS.MAX_METAFIELD_NAMESPACE_LEN)
          .regex(/^[a-zA-Z0-9_-]+$/, 'Namespace can only contain letters, numbers, underscores, and hyphens'),
        key: z
          .string()
          .trim()
          .min(1, 'Key is required')
          .max(CART_LIMITS.MAX_METAFIELD_KEY_LEN)
          .regex(/^[a-zA-Z0-9_-]+$/, 'Key can only contain letters, numbers, underscores, and hyphens'),
        value: z.string().max(CART_LIMITS.MAX_METAFIELD_VALUE_LEN),
        valueType: metafieldValueTypeEnum.default(METAFIELD_VALUE_TYPE.STRING),
      })
    )
    .optional(),
});

export const updateCartItemSchema = z
  .object({
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(CART_LIMITS.MIN_QUANTITY, `Quantity must be at least ${CART_LIMITS.MIN_QUANTITY}`)
      .max(CART_LIMITS.MAX_QUANTITY_PER_ITEM, `Quantity cannot exceed ${CART_LIMITS.MAX_QUANTITY_PER_ITEM}`)
      .optional(),
    modifierOptionIds: z.array(z.string().uuid('Invalid modifier option ID')).optional(),
  })
  .refine((data) => data.quantity !== undefined || data.modifierOptionIds !== undefined, {
    message: 'At least one field (quantity or modifierOptionIds) must be provided for update',
  });

export const mergeCartSchema = z.object({
  guestToken: z.string().trim().min(1, 'guestToken is required'),
});

export const createMetafieldSchema = z
  .object({
    namespace: z
      .string()
      .trim()
      .min(1, 'Namespace is required')
      .max(CART_LIMITS.MAX_METAFIELD_NAMESPACE_LEN)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Namespace can only contain letters, numbers, underscores, and hyphens'),
    key: z
      .string()
      .trim()
      .min(1, 'Key is required')
      .max(CART_LIMITS.MAX_METAFIELD_KEY_LEN)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Key can only contain letters, numbers, underscores, and hyphens'),
    value: z.string().max(CART_LIMITS.MAX_METAFIELD_VALUE_LEN),
    valueType: metafieldValueTypeEnum.default(METAFIELD_VALUE_TYPE.STRING),
  })
  .superRefine((data, ctx) => {
    try {
      validateMetafieldValue(data.value, data.valueType);
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: err.message,
      });
    }
  });

export const updateMetafieldSchema = z
  .object({
    value: z.string().max(CART_LIMITS.MAX_METAFIELD_VALUE_LEN),
    valueType: metafieldValueTypeEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.valueType) {
      try {
        validateMetafieldValue(data.value, data.valueType);
      } catch (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: err.message,
        });
      }
    }
  });

export const metafieldParamsSchema = z.object({
  cartId: z.string().trim().optional(),
  metafieldId: z.string().uuid('Invalid metafield ID'),
});

export const itemMetafieldParamsSchema = z.object({
  cartId: z.string().trim().optional(),
  itemId: z.string().uuid('Invalid cart item ID'),
  metafieldId: z.string().uuid('Invalid metafield ID'),
});
