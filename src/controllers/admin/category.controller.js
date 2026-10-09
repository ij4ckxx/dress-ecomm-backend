import {
  getCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from '../../services/admin/category.service.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * List categories in tree, flat, or root-only view
 * GET /api/v1/admin/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const result = await getCategoriesService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Categories fetched successfully',
      data: result.data,
      pagination: result.pagination,
      meta: {
        view: result.view,
        totalCount: result.totalCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category detail by ID
 * GET /api/v1/admin/categories/:id
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await getCategoryByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Category fetched successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category (supports JSON imageUrl or in-memory image upload)
 * POST /api/v1/admin/categories
 */
export const createCategory = async (req, res, next) => {
  try {
    let imageUrl = req.body.imageUrl || null;

    // If an image file was attached via multipart form, stream to Cloudinary
    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/categories');
      imageUrl = uploaded.url;
    }

    const newCategory = await createCategoryService({
      ...req.body,
      imageUrl,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Category created successfully',
      data: { category: newCategory },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a category (supports JSON or multipart image update)
 * PUT /api/v1/admin/categories/:id
 */
export const updateCategory = async (req, res, next) => {
  try {
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/categories');
      imageUrl = uploaded.url;
    }

    const payload = { ...req.body };
    if (imageUrl !== undefined) {
      payload.imageUrl = imageUrl;
    }

    const updatedCategory = await updateCategoryService(req.params.id, payload);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Category updated successfully',
      data: { category: updatedCategory },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete or archive a category
 * DELETE /api/v1/admin/categories/:id
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const result = await deleteCategoryService(req.params.id, { force });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Category deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
