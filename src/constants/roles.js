export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
  STORE_ADMIN: 'STORE_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

/**
 * Numeric hierarchy levels: higher number = greater authority
 */
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.STORE_ADMIN]: 3,
  [ROLES.STAFF]: 2,
  [ROLES.CUSTOMER]: 1,
};

/**
 * Roles that each level is permitted to create
 * - SUPER_ADMIN can create STORE_ADMIN, STAFF, CUSTOMER
 * - STORE_ADMIN can create STAFF, CUSTOMER
 * - STAFF can create CUSTOMER
 * - CUSTOMER cannot create any admin/sub-users
 */
export const CREATABLE_ROLES = {
  [ROLES.SUPER_ADMIN]: [ROLES.STORE_ADMIN, ROLES.STAFF, ROLES.CUSTOMER],
  [ROLES.STORE_ADMIN]: [ROLES.STAFF, ROLES.CUSTOMER],
  [ROLES.STAFF]: [ROLES.CUSTOMER],
  [ROLES.CUSTOMER]: [],
};
