/**
 * Cart domain constants and enums
 */

export const CART_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  CONVERTED: 'CONVERTED',
  ABANDONED: 'ABANDONED',
  EXPIRED: 'EXPIRED',
});

export const AVAILABILITY_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
});

export const METAFIELD_VALUE_TYPE = Object.freeze({
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  JSON: 'JSON',
});

export const CART_HEADERS = Object.freeze({
  GUEST_CART_TOKEN: 'x-guest-cart-token',
  CART_TOKEN: 'x-cart-token',
  GUEST_TOKEN: 'x-guest-token',
});

export const CART_LIMITS = Object.freeze({
  MIN_QUANTITY: 1,
  MAX_QUANTITY_PER_ITEM: 999,
  MAX_ITEMS_PER_CART: 100,
  MAX_METAFIELD_NAMESPACE_LEN: 64,
  MAX_METAFIELD_KEY_LEN: 64,
  MAX_METAFIELD_VALUE_LEN: 5000,
});
