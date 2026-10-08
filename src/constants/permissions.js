/**
 * Granular application permissions for RBAC
 */
export const PERMISSIONS = {
  // Catalog Management
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  PRODUCTS_DELETE: 'products:delete',
  CATEGORIES_MANAGE: 'categories:manage',
  COLLECTIONS_MANAGE: 'collections:manage',

  // Inventory Management
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',

  // Order Lifecycle
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_CANCEL: 'orders:cancel',

  // Promotions & Marketing
  COUPONS_MANAGE: 'coupons:manage',
  PROMOTIONS_MANAGE: 'promotions:manage',

  // Store Configuration
  SETTINGS_MANAGE: 'settings:manage',

  // User & Staff Management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  STAFF_MANAGE: 'staff:manage',

  // Analytics & Telemetry
  ANALYTICS_READ: 'analytics:read',
};

/**
 * Default permission presets by role
 */
export const ROLE_DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  STORE_ADMIN: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.COLLECTIONS_MANAGE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.COUPONS_MANAGE,
    PERMISSIONS.PROMOTIONS_MANAGE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.ANALYTICS_READ,
  ],
  STAFF: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
  ],
  CUSTOMER: [],
};
