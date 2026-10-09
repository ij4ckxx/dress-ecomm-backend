import {
  getProductsService,
  getProductByIdService,
  createProductService,
  updateProductService,
  toggleProductStatusService,
  deleteProductService,
  addProductImageService,
  deleteProductImageService,
} from '../../services/admin/product.service.js';
import { uploadImageToCloudinary } from '../../utils/cloudinary.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * List paginated products with faceted filters for admin table
 * GET /api/v1/admin/products
 */
export const getProducts = async (req, res, next) => {
  try {
    const result = await getProductsService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Products fetched successfully',
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product detail by ID
 * GET /api/v1/admin/products/:id
 */
export const getProductById = async (req, res, next) => {
  try {
    const product = await getProductByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Product fetched successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new product with variants and optional image files
 * POST /api/v1/admin/products
 */
export const createProduct = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    // Parse JSON string fields if sent via multipart/form-data
    if (typeof payload.variants === 'string') {
      try {
        payload.variants = JSON.parse(payload.variants);
      } catch {
        payload.variants = [];
      }
    }

    if (typeof payload.images === 'string') {
      try {
        payload.images = JSON.parse(payload.images);
      } catch {
        payload.images = [];
      }
    }

    if (!payload.images) {
      payload.images = [];
    }

    // If image files were attached via multipart/form-data, stream them to Cloudinary
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploaded = await uploadImageToCloudinary(file.buffer, 'dresses/products');
        payload.images.push({
          url: uploaded.url,
          altText: `${payload.name} image ${i + 1}`,
          isThumbnail: i === 0 && payload.images.length === 0,
          sortOrder: payload.images.length + i,
        });
      }
    }

    const newProduct = await createProductService(payload);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Product created successfully',
      data: { product: newProduct },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product and variant attributes
 * PUT /api/v1/admin/products/:id
 */
export const updateProduct = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (typeof payload.variants === 'string') {
      try {
        payload.variants = JSON.parse(payload.variants);
      } catch {
        delete payload.variants;
      }
    }

    if (typeof payload.images === 'string') {
      try {
        payload.images = JSON.parse(payload.images);
      } catch {
        delete payload.images;
      }
    }

    // If new files were uploaded during edit, stream to Cloudinary
    if (req.files && req.files.length > 0) {
      if (!payload.images) payload.images = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploaded = await uploadImageToCloudinary(file.buffer, 'dresses/products');
        payload.images.push({
          url: uploaded.url,
          altText: `${payload.name || 'Product'} image`,
          isThumbnail: false,
          sortOrder: i,
        });
      }
    }

    const updatedProduct = await updateProductService(req.params.id, payload);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Product updated successfully',
      data: { product: updatedProduct },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick toggle for active / featured status
 * PATCH /api/v1/admin/products/:id/status
 */
export const toggleProductStatus = async (req, res, next) => {
  try {
    const result = await toggleProductStatusService(req.params.id, req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Product status updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete or soft-archive a product
 * DELETE /api/v1/admin/products/:id
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const result = await deleteProductService(req.params.id, { force });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload additional images to an existing product
 * POST /api/v1/admin/products/:id/images
 */
export const uploadProductImages = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const uploadedImages = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploaded = await uploadImageToCloudinary(file.buffer, 'dresses/products');
        const imgRecord = await addProductImageService(productId, {
          url: uploaded.url,
          altText: req.body.altText || `Product image`,
          isThumbnail: req.body.isThumbnail === 'true' && i === 0,
          sortOrder: i,
          variantId: req.body.variantId || null,
        });
        uploadedImages.push(imgRecord);
      }
    } else if (req.body.url) {
      const imgRecord = await addProductImageService(productId, req.body);
      uploadedImages.push(imgRecord);
    }

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: { images: uploadedImages },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an image from a product
 * DELETE /api/v1/admin/products/:id/images/:imageId
 */
export const deleteProductImage = async (req, res, next) => {
  try {
    const result = await deleteProductImageService(req.params.id, req.params.imageId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Image deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
