/**
 * Reusable pagination helpers across the backend
 */

/**
 * Extracts and sanitizes pagination parameters from query
 * @param {object} query
 * @param {number} [defaultLimit=24]
 * @param {number} [maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
export const parsePagination = (query = {}, defaultLimit = 24, maxLimit = 100) => {
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
};

/**
 * Formats standard pagination metadata for API response
 * @param {object} params
 * @param {number} params.total
 * @param {number} params.page
 * @param {number} params.limit
 * @returns {{ page: number, limit: number, total: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean }}
 */
export const formatPagination = ({ total = 0, page = 1, limit = 24 }) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};
