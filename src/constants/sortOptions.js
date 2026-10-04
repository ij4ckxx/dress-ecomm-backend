/**
 * Valid sort keys supported by Product discovery APIs
 */
export const PRODUCT_SORT_OPTIONS = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  NEWEST: 'newest',
  OLDEST: 'oldest',
  BESTSELLING: 'bestselling',
  BEST_DEALS: 'best_deals',
  RATING: 'rating',
};

export const ALLOWED_SORT_VALUES = Object.values(PRODUCT_SORT_OPTIONS);
