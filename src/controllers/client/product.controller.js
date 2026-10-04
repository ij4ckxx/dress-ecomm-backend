import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getProducts,
  getProductBySlug,
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
