import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  getCategories,
  getCategoryBySlug,
  getCategoryProducts,
} from '../../services/client/category.service.js';
import { getProductFilters } from '../../services/client/product.service.js';

/**
 * Lists categories (tree hierarchy, root-only, or flat)
 */
export const listCategories = async (req, res, next) => {
  try {
    const { tree, rootOnly } = req.query;
    const categories = await getCategories({ tree, rootOnly });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Categories fetched successfully',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets category details by slug with parent breadcrumb and subcategories
 */
export const getCategoryDetails = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await getCategoryBySlug(slug);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Category fetched successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets lightweight product summaries for a category page (PLP)
 */
export const getCategoryProductList = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id || null;
    const { category, products, pagination } = await getCategoryProducts(slug, req.query, userId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Category products fetched successfully',
      data: {
        category,
        products,
      },
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets dynamic filter options scoped to a category
 */
export const getCategoryFilterOptions = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const filters = await getProductFilters({ ...req.query, category: slug });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Category filter options fetched successfully',
      data: filters,
    });
  } catch (error) {
    next(error);
  }
};
