import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getProducts,
  getProductBySlug,
  getProductFilters,
} from '../../services/client/product.service.js';

/**
 * Lists & discovers products with search, filters, dynamic attributes, sorting, and pagination
 */
export const listProducts = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const { products, pagination } = await getProducts(req.query, userId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Products fetched successfully',
      data: products,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets complete product details by slug
 */
export const getProductDetails = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id || null;
    const product = await getProductBySlug(slug, userId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Product details fetched successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets dynamic catalog filter options (facets, attributes, price range, brands, categories)
 */
export const getProductFilterOptions = async (req, res, next) => {
  try {
    const filters = await getProductFilters(req.query);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Product filter options fetched successfully',
      data: filters,
    });
  } catch (error) {
    next(error);
  }
};
