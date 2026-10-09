import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { generateUniqueSlug } from '../../utils/slug.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Retrieves paginated collections for admin table
 */
export const getCollectionsService = async ({ query }) => {
  const { page = 1, limit = 20, search, isFeatured, isActive } = query;
  const skip = (page - 1) * limit;

  const where = {};
  if (isFeatured !== undefined) where.isFeatured = isFeatured;
  if (isActive !== undefined) where.isActive = isActive;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),
    prisma.collection.count({ where }),
  ]);

  return {
    collections: collections.map((col) => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      description: col.description,
      imageUrl: col.imageUrl,
      isFeatured: col.isFeatured,
      sortOrder: col.sortOrder,
      isActive: col.isActive,
      productsCount: col._count.products,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt,
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
 * Retrieves single collection details with ordered products list
 */
export const getCollectionByIdService = async (id) => {
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              brand: true,
              sku: true,
              regularPrice: true,
              salePrice: true,
              offerPrice: true,
              stockQuantity: true,
              isActive: true,
              category: {
                select: { id: true, name: true, slug: true },
              },
              images: {
                where: { isThumbnail: true },
                select: { url: true, altText: true },
                take: 1,
              },
            },
          },
        },
      },
      _count: {
        select: { products: true },
      },
    },
  });

  if (!collection) {
    throw createServiceError('Collection not found', HTTP_STATUS.NOT_FOUND, 'COLLECTION_NOT_FOUND');
  }

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    imageUrl: collection.imageUrl,
    isFeatured: collection.isFeatured,
    sortOrder: collection.sortOrder,
    isActive: collection.isActive,
    productsCount: collection._count.products,
    products: collection.products.map((cp) => ({
      id: cp.product.id,
      name: cp.product.name,
      slug: cp.product.slug,
      brand: cp.product.brand,
      sku: cp.product.sku,
      regularPrice: cp.product.regularPrice,
      salePrice: cp.product.salePrice,
      stockQuantity: cp.product.stockQuantity,
      isActive: cp.product.isActive,
      thumbnail: cp.product.images[0]?.url || null,
      category: cp.product.category,
      collectionSortOrder: cp.sortOrder,
      addedAt: cp.addedAt,
    })),
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
};

/**
 * Creates a new curated collection with unique slug and optional initial products
 */
export const createCollectionService = async (data) => {
  const {
    name,
    slug,
    description,
    imageUrl,
    isFeatured = false,
    sortOrder = 0,
    isActive = true,
    productIds = [],
  } = data;

  const resolvedSlug = await generateUniqueSlug(prisma.collection, slug || name);

  const newCollection = await prisma.$transaction(async (tx) => {
    const created = await tx.collection.create({
      data: {
        name,
        slug: resolvedSlug,
        description: description || null,
        imageUrl: imageUrl || null,
        isFeatured,
        sortOrder,
        isActive,
      },
    });

    if (productIds.length > 0) {
      // Validate that all productIds exist
      const foundProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });

      const foundIds = new Set(foundProducts.map((p) => p.id));
      const validProductIds = productIds.filter((pId) => foundIds.has(pId));

      if (validProductIds.length > 0) {
        await tx.productCollection.createMany({
          data: validProductIds.map((pId, index) => ({
            collectionId: created.id,
            productId: pId,
            sortOrder: index,
          })),
          skipDuplicates: true,
        });
      }
    }

    return created;
  });

  return getCollectionByIdService(newCollection.id);
};

/**
 * Updates a curated collection details
 */
export const updateCollectionService = async (id, data) => {
  const existing = await prisma.collection.findUnique({
    where: { id },
  });

  if (!existing) {
    throw createServiceError('Collection not found', HTTP_STATUS.NOT_FOUND, 'COLLECTION_NOT_FOUND');
  }

  const dataToUpdate = {};
  if (data.name) {
    dataToUpdate.name = data.name;
    if (!data.slug && data.name !== existing.name) {
      dataToUpdate.slug = await generateUniqueSlug(prisma.collection, data.name, id);
    }
  }

  if (data.slug) {
    dataToUpdate.slug = await generateUniqueSlug(prisma.collection, data.slug, id);
  }

  if (data.description !== undefined) dataToUpdate.description = data.description;
  if (data.imageUrl !== undefined) dataToUpdate.imageUrl = data.imageUrl;
  if (data.isFeatured !== undefined) dataToUpdate.isFeatured = data.isFeatured;
  if (data.sortOrder !== undefined) dataToUpdate.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) dataToUpdate.isActive = data.isActive;

  const updated = await prisma.collection.update({
    where: { id },
    data: dataToUpdate,
    include: {
      _count: { select: { products: true } },
    },
  });

  return {
    ...updated,
    productsCount: updated._count.products,
  };
};

/**
 * Replaces and re-orders the products in a collection
 */
export const syncCollectionProductsService = async (collectionId, productIds) => {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw createServiceError('Collection not found', HTTP_STATUS.NOT_FOUND, 'COLLECTION_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Remove existing products from collection
    await tx.productCollection.deleteMany({
      where: { collectionId },
    });

    // 2. Add new products in given order
    if (productIds.length > 0) {
      const validProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });

      const validIdSet = new Set(validProducts.map((p) => p.id));
      const orderedValidIds = productIds.filter((pId) => validIdSet.has(pId));

      if (orderedValidIds.length > 0) {
        await tx.productCollection.createMany({
          data: orderedValidIds.map((pId, index) => ({
            collectionId,
            productId: pId,
            sortOrder: index,
          })),
        });
      }
    }
  });

  return getCollectionByIdService(collectionId);
};

/**
 * Adds products to a collection without wiping existing ones
 */
export const addProductsToCollectionService = async (collectionId, productIds) => {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      products: { select: { productId: true } },
    },
  });

  if (!collection) {
    throw createServiceError('Collection not found', HTTP_STATUS.NOT_FOUND, 'COLLECTION_NOT_FOUND');
  }

  const existingProductIds = new Set(collection.products.map((p) => p.productId));
  const newProductIds = productIds.filter((id) => !existingProductIds.has(id));

  if (newProductIds.length === 0) {
    return getCollectionByIdService(collectionId);
  }

  const validProducts = await prisma.product.findMany({
    where: { id: { in: newProductIds } },
    select: { id: true },
  });

  const validIds = validProducts.map((p) => p.id);
  const currentCount = collection.products.length;

  if (validIds.length > 0) {
    await prisma.productCollection.createMany({
      data: validIds.map((pId, idx) => ({
        collectionId,
        productId: pId,
        sortOrder: currentCount + idx,
      })),
      skipDuplicates: true,
    });
  }

  return getCollectionByIdService(collectionId);
};

/**
 * Removes a single product from a collection
 */
export const removeProductFromCollectionService = async (collectionId, productId) => {
  await prisma.productCollection.deleteMany({
    where: {
      collectionId,
      productId,
    },
  });

  return {
    collectionId,
    productId,
    removed: true,
  };
};

/**
 * Deletes a collection
 */
export const deleteCollectionService = async (id) => {
  const collection = await prisma.collection.findUnique({
    where: { id },
  });

  if (!collection) {
    throw createServiceError('Collection not found', HTTP_STATUS.NOT_FOUND, 'COLLECTION_NOT_FOUND');
  }

  await prisma.collection.delete({
    where: { id },
  });

  return {
    id,
    name: collection.name,
    deleted: true,
  };
};
