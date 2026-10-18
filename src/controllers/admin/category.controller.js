import {
  getCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from '../../services/admin/category.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';

/**
 * Get categories (tree, flat, or root-only)
 * GET /api/v1/admin/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const result = await getCategoriesService(req.query);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Categories fetched successfully',
      data: result.categories ? { categories: result.categories } : result,
      pagination: result.pagination || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID with ancestors and children
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
 * Create a new category (supports direct file upload OR imageUrl, one only)
 * POST /api/v1/admin/categories
 */
export const createCategory = async (req, res, next) => {
  try {
    const hasFile = Boolean(req.file);
    const hasUrl = Boolean(req.body.imageUrl && typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim() !== '');

    if (hasFile && hasUrl) {
      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Conflicting image input: Please provide either an image file upload OR an image URL, not both.',
        error: {
          code: 'IMAGE_INPUT_CONFLICT',
          details: [{ field: 'image', message: 'Cannot accept both an image file upload and imageUrl simultaneously.' }],
        },
      });
    }

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
 * Update a category (supports direct file upload OR imageUrl, one only)
 * PUT /api/v1/admin/categories/:id
 */
export const updateCategory = async (req, res, next) => {
  try {
    const hasFile = Boolean(req.file);
    const hasUrl = Boolean(req.body.imageUrl && typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim() !== '');

    if (hasFile && hasUrl) {
      return sendError(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Conflicting image input: Please provide either an image file upload OR an image URL, not both.',
        error: {
          code: 'IMAGE_INPUT_CONFLICT',
          details: [{ field: 'image', message: 'Cannot accept both an image file upload and imageUrl simultaneously.' }],
        },
      });
    }

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
    const result = await deleteCategoryService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message || 'Category deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
