import {
  getCollectionsService,
  getCollectionByIdService,
  createCollectionService,
  updateCollectionService,
  syncCollectionProductsService,
  addProductsToCollectionService,
  removeProductFromCollectionService,
  deleteCollectionService,
} from '../../services/admin/collection.service.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * List paginated collections
 * GET /api/v1/admin/collections
 */
export const getCollections = async (req, res, next) => {
  try {
    const result = await getCollectionsService({ query: req.query });

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
 * Get collection detail with linked products
 * GET /api/v1/admin/collections/:id
 */
export const getCollectionById = async (req, res, next) => {
  try {
    const collection = await getCollectionByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Collection fetched successfully',
      data: { collection },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new curated collection
 * POST /api/v1/admin/collections
 */
export const createCollection = async (req, res, next) => {
  try {
    let imageUrl = req.body.imageUrl || null;

    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/collections');
      imageUrl = uploaded.url;
    }

    // Support productIds as JSON string if sent in FormData
    let productIds = req.body.productIds || [];
    if (typeof productIds === 'string') {
      try {
        productIds = JSON.parse(productIds);
      } catch {
        productIds = productIds.split(',').map((id) => id.trim());
      }
    }

    const newCollection = await createCollectionService({
      ...req.body,
      imageUrl,
      productIds,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Collection created successfully',
      data: { collection: newCollection },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update collection details
 * PUT /api/v1/admin/collections/:id
 */
export const updateCollection = async (req, res, next) => {
  try {
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'dresses/collections');
      imageUrl = uploaded.url;
    }

    const payload = { ...req.body };
    if (imageUrl !== undefined) {
      payload.imageUrl = imageUrl;
    }

    const updated = await updateCollectionService(req.params.id, payload);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Collection updated successfully',
      data: { collection: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Replace / reorder products in a collection
 * PUT /api/v1/admin/collections/:id/products
 */
export const syncCollectionProducts = async (req, res, next) => {
  try {
    const { productIds } = req.body;
    const collection = await syncCollectionProductsService(req.params.id, productIds);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Collection products updated successfully',
      data: { collection },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Append products to a collection
 * POST /api/v1/admin/collections/:id/products
 */
export const addProductsToCollection = async (req, res, next) => {
  try {
    const { productIds } = req.body;
    const collection = await addProductsToCollectionService(req.params.id, productIds);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Products added to collection successfully',
      data: { collection },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a single product from a collection
 * DELETE /api/v1/admin/collections/:id/products/:productId
 */
export const removeProductFromCollection = async (req, res, next) => {
  try {
    const result = await removeProductFromCollectionService(req.params.id, req.params.productId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Product removed from collection successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a collection
 * DELETE /api/v1/admin/collections/:id
 */
export const deleteCollection = async (req, res, next) => {
  try {
    const result = await deleteCollectionService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Collection deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
