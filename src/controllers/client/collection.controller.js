import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getClientCollections,
  getClientCollectionBySlug,
} from '../../services/client/collection.service.js';

/**
 * Lists all active collections/lookbooks for the customer storefront
 * GET /api/v1/collections
 * GET /api/collections
 */
export const listCollections = async (req, res, next) => {
  try {
    const result = await getClientCollections({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Collections fetched successfully',
      data: result.collections,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single collection by slug with associated products
 * GET /api/v1/collections/:slug
 * GET /api/collections/:slug
 */
export const getCollectionDetails = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const collection = await getClientCollectionBySlug(slug, { query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Collection fetched successfully',
      data: collection,
    });
  } catch (error) {
    next(error);
  }
};
