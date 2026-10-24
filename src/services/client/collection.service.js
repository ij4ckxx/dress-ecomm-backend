import prisma from '../../config/db.js';
import { formatPrice } from '../../utils/pricing.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Retrieves curated collections / lookbooks for the customer storefront with optional pagination
 * @param {object} [options]
 * @param {object} [options.query]
 * @returns {Promise<object>} List of active collections with pagination metadata
 */
export const getClientCollections = async (options = {}) => {
  const query = options.query || options || {};
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = { isActive: true };

  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            products: {
              where: {
                product: { isActive: true },
              },
            },
          },
        },
      },
    }),
    prisma.collection.count({ where }),
  ]);

  const formattedCollections = collections.map((col) => ({
    id: col.id,
    name: col.name,
    slug: col.slug,
    description: col.description,
    imageUrl: col.imageUrl,
    isFeatured: col.isFeatured,
    sortOrder: col.sortOrder,
    productsCount: col._count.products,
  }));

  return {
    collections: formattedCollections,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Retrieves single collection details with paginated active products for lookbook capsule pages
 * @param {string} slug - Collection slug
 * @param {object} [options]
 * @param {object} [options.query]
 * @returns {Promise<object>} Collection with paginated products
 */
export const getClientCollectionBySlug = async (slug, options = {}) => {
  const query = options.query || options || {};
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      isFeatured: true,
      sortOrder: true,
    },
  });

  if (!collection) {
    throw new AppError('Collection not found', HTTP_STATUS.NOT_FOUND, 'COLLECTION_NOT_FOUND');
  }

  const productWhere = {
    collectionId: collection.id,
    product: { isActive: true },
  };

  const [productLinks, totalProducts] = await Promise.all([
    prisma.productCollection.findMany({
      where: productWhere,
      skip,
      take: limit,
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          include: {
            images: {
              where: { isThumbnail: true },
              take: 1,
              select: { url: true, altText: true },
            },
            variants: {
              where: { isActive: true },
              select: { id: true, stockQuantity: true },
            },
          },
        },
      },
    }),
    prisma.productCollection.count({ where: productWhere }),
  ]);

  const activeProducts = productLinks.map((cp) => {
    const p = cp.product;
    const price = formatPrice(p.regularPrice, p.salePrice, p.offerPrice);
    const inStock = p.stockQuantity > 0 || p.variants.some((v) => v.stockQuantity > 0);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      thumbnail: p.images[0]?.url || null,
      price,
      rating: p.rating,
      reviewCount: p.reviewCount,
      inStock,
      sortOrder: cp.sortOrder,
    };
  });

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    imageUrl: collection.imageUrl,
    isFeatured: collection.isFeatured,
    productsCount: totalProducts,
    products: activeProducts,
    pagination: {
      page,
      limit,
      total: totalProducts,
      totalPages: Math.ceil(totalProducts / limit) || 1,
      hasNextPage: page < Math.ceil(totalProducts / limit),
      hasPrevPage: page > 1,
    },
  };
};
