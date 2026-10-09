import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { generateUniqueSlug } from '../../utils/slug.js';
import { getDescendantCategoryIds } from '../client/category.service.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Builds Prisma sort order from query string
 */
const buildSortOrder = (sortKey) => {
  switch (sortKey) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'price_asc':
      return [{ regularPrice: 'asc' }];
    case 'price_desc':
      return [{ regularPrice: 'desc' }];
    case 'stock_asc':
      return [{ stockQuantity: 'asc' }];
    case 'stock_desc':
      return [{ stockQuantity: 'desc' }];
    case 'name_asc':
      return [{ name: 'asc' }];
    case 'bestselling':
      return [{ totalSold: 'desc' }];
    case 'newest':
    default:
      return [{ createdAt: 'desc' }];
  }
};

/**
 * Ensures attribute ("Size", "Color") and its value exist in database
 */
const getOrCreateAttributeValue = async (tx, attributeName, valueName) => {
  if (!valueName) return null;

  const attrSlug = attributeName.toLowerCase().trim();
  const valSlug = valueName.toLowerCase().trim().replace(/\s+/g, '-');

  // Find or create attribute
  let attr = await tx.attribute.findUnique({
    where: { slug: attrSlug },
  });
  if (!attr) {
    attr = await tx.attribute.create({
      data: {
        name: attributeName,
        slug: attrSlug,
        isFilterable: true,
      },
    });
  }

  // Find or create attribute value
  let attrVal = await tx.attributeValue.findUnique({
    where: {
      attributeId_slug: {
        attributeId: attr.id,
        slug: valSlug,
      },
    },
  });
  if (!attrVal) {
    attrVal = await tx.attributeValue.create({
      data: {
        attributeId: attr.id,
        value: valueName,
        slug: valSlug,
      },
    });
  }

  return attrVal.id;
};

/**
 * Retrieves paginated products for admin dashboard
 */
export const getProductsService = async ({ query }) => {
  const {
    page = 1,
    limit = 20,
    search,
    categoryId,
    brand,
    isActive,
    isFeatured,
    stockStatus,
    minPrice,
    maxPrice,
    sort = 'newest',
  } = query;

  const skip = (page - 1) * limit;
  const where = {};

  if (isActive !== undefined) where.isActive = isActive;
  if (isFeatured !== undefined) where.isFeatured = isFeatured;
  if (brand) where.brand = { equals: brand, mode: 'insensitive' };

  // Category filter (includes subcategories)
  if (categoryId) {
    const categoryIds = await getDescendantCategoryIds(categoryId);
    where.categoryId = { in: categoryIds };
  }

  // Stock status filter
  if (stockStatus) {
    if (stockStatus === 'IN_STOCK') {
      where.stockQuantity = { gt: 0 };
    } else if (stockStatus === 'LOW_STOCK') {
      where.stockQuantity = { gt: 0, lte: 5 };
    } else if (stockStatus === 'OUT_OF_STOCK') {
      where.stockQuantity = 0;
    }
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.regularPrice = {};
    if (minPrice !== undefined) where.regularPrice.gte = minPrice;
    if (maxPrice !== undefined) where.regularPrice.lte = maxPrice;
  }

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy = buildSortOrder(sort);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { url: true, altText: true },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            stockQuantity: true,
            regularPrice: true,
            salePrice: true,
            isActive: true,
          },
        },
        _count: {
          select: { images: true, variants: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((prod) => ({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      brand: prod.brand,
      sku: prod.sku,
      regularPrice: prod.regularPrice,
      salePrice: prod.salePrice,
      offerPrice: prod.offerPrice,
      costPrice: prod.costPrice,
      stockQuantity: prod.stockQuantity,
      isActive: prod.isActive,
      isFeatured: prod.isFeatured,
      totalSold: prod.totalSold,
      rating: prod.rating,
      reviewCount: prod.reviewCount,
      category: prod.category,
      thumbnail: prod.images[0]?.url || null,
      imagesCount: prod._count.images,
      variantsCount: prod._count.variants,
      variantsSummary: prod.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        stock: v.stockQuantity,
        price: v.salePrice || v.regularPrice,
        isActive: v.isActive,
      })),
      createdAt: prod.createdAt,
      updatedAt: prod.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves complete single product details for admin editor
 */
export const getProductByIdService = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
      images: {
        orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
      },
      variants: {
        orderBy: { createdAt: 'asc' },
        include: {
          attributes: {
            include: {
              attributeValue: {
                include: { attribute: true },
              },
            },
          },
        },
      },
      collections: {
        include: {
          collection: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  if (!product) {
    throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    sku: product.sku,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    offerPrice: product.offerPrice,
    costPrice: product.costPrice,
    stockQuantity: product.stockQuantity,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    totalSold: product.totalSold,
    rating: product.rating,
    reviewCount: product.reviewCount,
    category: product.category,
    images: product.images,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      regularPrice: v.regularPrice,
      salePrice: v.salePrice,
      offerPrice: v.offerPrice,
      costPrice: v.costPrice,
      stockQuantity: v.stockQuantity,
      isActive: v.isActive,
      attributes: v.attributes.map((va) => ({
        attributeName: va.attributeValue.attribute.name,
        value: va.attributeValue.value,
        slug: va.attributeValue.slug,
      })),
      createdAt: v.createdAt,
    })),
    collections: product.collections.map((c) => c.collection),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

/**
 * Creates a new product with variants and images in an atomic transaction
 */
export const createProductService = async (data) => {
  const {
    name,
    slug,
    description,
    brand = 'Maison De Élégance',
    sku,
    categoryId,
    regularPrice,
    salePrice,
    offerPrice,
    costPrice,
    stockQuantity = 0,
    isActive = true,
    isFeatured = false,
    images = [],
    variants = [],
  } = data;

  // 1. Verify Category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw createServiceError('Specified Category not found', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  }

  // 2. Resolve unique slug
  const resolvedSlug = await generateUniqueSlug(prisma.product, slug || name);

  // 3. Resolve SKU (auto-generate if missing)
  const resolvedSku =
    sku ||
    `PRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Check SKU uniqueness
  const existingSku = await prisma.product.findUnique({
    where: { sku: resolvedSku },
    select: { id: true },
  });
  if (existingSku) {
    throw createServiceError(`A product with SKU "${resolvedSku}" already exists.`, HTTP_STATUS.CONFLICT, 'DUPLICATE_SKU');
  }

  // 4. Calculate total stock (sum of variant stocks if variants exist)
  let totalStock = stockQuantity;
  if (variants.length > 0) {
    totalStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
  }

  // 5. Execute atomic creation
  const createdProduct = await prisma.$transaction(async (tx) => {
    // A. Create Product
    const newProduct = await tx.product.create({
      data: {
        name,
        slug: resolvedSlug,
        description: description || null,
        brand,
        sku: resolvedSku,
        categoryId,
        regularPrice,
        salePrice: salePrice || null,
        offerPrice: offerPrice || null,
        costPrice: costPrice || null,
        stockQuantity: totalStock,
        isActive,
        isFeatured,
      },
    });

    // B. Create Product Images
    if (images.length > 0) {
      await tx.productImage.createMany({
        data: images.map((img, idx) => ({
          productId: newProduct.id,
          url: img.url,
          altText: img.altText || `${name} image ${idx + 1}`,
          isThumbnail: img.isThumbnail ?? (idx === 0),
          sortOrder: img.sortOrder ?? idx,
        })),
      });
    }

    // C. Create Variants and link Attributes
    if (variants.length > 0) {
      for (const variant of variants) {
        // Validate variant SKU
        const existingVariantSku = await tx.productVariant.findUnique({
          where: { sku: variant.sku },
          select: { id: true },
        });
        if (existingVariantSku) {
          throw createServiceError(
            `Variant SKU "${variant.sku}" is already in use by another product variant.`,
            HTTP_STATUS.CONFLICT,
            'DUPLICATE_VARIANT_SKU'
          );
        }

        const newVariant = await tx.productVariant.create({
          data: {
            productId: newProduct.id,
            sku: variant.sku,
            name: variant.name || `${name} - ${variant.size || variant.color || variant.sku}`,
            regularPrice: variant.regularPrice || regularPrice,
            salePrice: variant.salePrice || salePrice || null,
            offerPrice: variant.offerPrice || offerPrice || null,
            costPrice: variant.costPrice || costPrice || null,
            stockQuantity: variant.stockQuantity || 0,
            isActive: variant.isActive ?? true,
          },
        });

        // Link Size attribute
        if (variant.size) {
          const sizeValId = await getOrCreateAttributeValue(tx, 'Size', variant.size);
          if (sizeValId) {
            await tx.productVariantAttribute.create({
              data: {
                variantId: newVariant.id,
                attributeValueId: sizeValId,
              },
            });
          }
        }

        // Link Color attribute
        if (variant.color) {
          const colorValId = await getOrCreateAttributeValue(tx, 'Color', variant.color);
          if (colorValId) {
            await tx.productVariantAttribute.create({
              data: {
                variantId: newVariant.id,
                attributeValueId: colorValId,
              },
            });
          }
        }
      }
    }

    return newProduct;
  });

  return getProductByIdService(createdProduct.id);
};

/**
 * Updates an existing product, recalculates stocks, and updates variants
 */
export const updateProductService = async (id, data) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!existing) {
    throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  // 1. Verify category if changing
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw createServiceError('Category not found', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
    }
  }

  // 2. Resolve slug if name/slug modified
  let resolvedSlug = undefined;
  if (data.slug) {
    resolvedSlug = await generateUniqueSlug(prisma.product, data.slug, id);
  } else if (data.name && data.name !== existing.name) {
    resolvedSlug = await generateUniqueSlug(prisma.product, data.name, id);
  }

  // 3. Resolve SKU uniqueness if SKU updated
  if (data.sku && data.sku !== existing.sku) {
    const duplicateSku = await prisma.product.findUnique({
      where: { sku: data.sku },
      select: { id: true },
    });
    if (duplicateSku) {
      throw createServiceError(`SKU "${data.sku}" is already in use.`, HTTP_STATUS.CONFLICT, 'DUPLICATE_SKU');
    }
  }

  // 4. Atomic Update
  await prisma.$transaction(async (tx) => {
    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (resolvedSlug) updatePayload.slug = resolvedSlug;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.brand !== undefined) updatePayload.brand = data.brand;
    if (data.sku !== undefined) updatePayload.sku = data.sku;
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
    if (data.regularPrice !== undefined) updatePayload.regularPrice = data.regularPrice;
    if (data.salePrice !== undefined) updatePayload.salePrice = data.salePrice;
    if (data.offerPrice !== undefined) updatePayload.offerPrice = data.offerPrice;
    if (data.costPrice !== undefined) updatePayload.costPrice = data.costPrice;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;
    if (data.isFeatured !== undefined) updatePayload.isFeatured = data.isFeatured;

    // Handle Variants updates
    if (data.variants && data.variants.length > 0) {
      for (const variant of data.variants) {
        if (variant.id) {
          // Update existing variant
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              sku: variant.sku,
              name: variant.name,
              regularPrice: variant.regularPrice,
              salePrice: variant.salePrice,
              offerPrice: variant.offerPrice,
              costPrice: variant.costPrice,
              stockQuantity: variant.stockQuantity,
              isActive: variant.isActive,
            },
          });
        } else {
          // Create new variant under this product
          const newVar = await tx.productVariant.create({
            data: {
              productId: id,
              sku: variant.sku,
              name: variant.name || `${existing.name} - ${variant.sku}`,
              regularPrice: variant.regularPrice || existing.regularPrice,
              salePrice: variant.salePrice || existing.salePrice,
              offerPrice: variant.offerPrice || existing.offerPrice,
              costPrice: variant.costPrice || existing.costPrice,
              stockQuantity: variant.stockQuantity || 0,
              isActive: variant.isActive ?? true,
            },
          });

          if (variant.size) {
            const sizeValId = await getOrCreateAttributeValue(tx, 'Size', variant.size);
            if (sizeValId) {
              await tx.productVariantAttribute.create({
                data: { variantId: newVar.id, attributeValueId: sizeValId },
              });
            }
          }
          if (variant.color) {
            const colorValId = await getOrCreateAttributeValue(tx, 'Color', variant.color);
            if (colorValId) {
              await tx.productVariantAttribute.create({
                data: { variantId: newVar.id, attributeValueId: colorValId },
              });
            }
          }
        }
      }

      // Re-sum total stock from all variants
      const allCurrentVariants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { stockQuantity: true },
      });
      updatePayload.stockQuantity = allCurrentVariants.reduce((sum, v) => sum + v.stockQuantity, 0);
    } else if (data.stockQuantity !== undefined) {
      updatePayload.stockQuantity = data.stockQuantity;
    }

    // Execute product update
    await tx.product.update({
      where: { id },
      data: updatePayload,
    });
  });

  return getProductByIdService(id);
};

/**
 * Quick toggle for active / featured status
 */
export const toggleProductStatusService = async (id, { isActive, isFeatured }) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  const data = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (isFeatured !== undefined) data.isFeatured = isFeatured;

  const updated = await prisma.product.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      isFeatured: true,
      updatedAt: true,
    },
  });

  return updated;
};

/**
 * Deletes a product, with safe automatic soft-archiving if referenced in cart or wishlist
 */
export const deleteProductService = async (id, { force = false } = {}) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!product) {
    throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  // Check if product is in active carts
  const cartItemCount = await prisma.cartItem.count({
    where: { productId: id },
  });

  if (cartItemCount > 0 && !force) {
    // Soft-archive to protect active orders and cart integrity
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      id,
      name: product.name,
      action: 'ARCHIVED',
      message: `Product "${product.name}" is present in customer carts and was archived (set to inactive) instead of deleted.`,
    };
  }

  // Permanently delete
  await prisma.product.delete({
    where: { id },
  });

  return {
    id,
    name: product.name,
    action: 'DELETED',
    message: `Product "${product.name}" was permanently deleted.`,
  };
};

/**
 * Adds an image to a product gallery
 */
export const addProductImageService = async (productId, { url, altText, isThumbnail = false, sortOrder = 0, variantId = null }) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });

  if (!product) {
    throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  // If set as thumbnail, remove thumbnail flag from others
  if (isThumbnail) {
    await prisma.productImage.updateMany({
      where: { productId },
      data: { isThumbnail: false },
    });
  }

  const image = await prisma.productImage.create({
    data: {
      productId,
      url,
      altText: altText || `${product.name} image`,
      isThumbnail,
      sortOrder,
      variantId: variantId || null,
    },
  });

  return image;
};

/**
 * Deletes an image from a product
 */
export const deleteProductImageService = async (productId, imageId) => {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
  });

  if (!image) {
    throw createServiceError('Image not found on this product', HTTP_STATUS.NOT_FOUND, 'IMAGE_NOT_FOUND');
  }

  await prisma.productImage.delete({
    where: { id: imageId },
  });

  return {
    productId,
    imageId,
    deleted: true,
  };
};
