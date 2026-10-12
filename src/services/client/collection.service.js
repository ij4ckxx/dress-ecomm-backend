import prisma from '../../config/db.js';
import { formatPrice } from '../../utils/pricing.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Retrieves all active curated collections / lookbooks for the customer storefront
 * @returns {Promise<Array<object>>} List of active collections
 */
export const getClientCollections = async () => {
  const collections = await prisma.collection.findMany({
    where: { isActive: true },
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
  });

  return collections.map((col) => ({
    id: col.id,
    name: col.name,
    slug: col.slug,
    description: col.description,
    imageUrl: col.imageUrl,
    isFeatured: col.isFeatured,
    sortOrder: col.sortOrder,
    productsCount: col._count.products,
  }));
};

/**
 * Retrieves single collection details with its active products for lookbook capsule pages
 * @param {string} slug - Collection slug
 * @returns {Promise<object>} Collection with products
 */
export const getClientCollectionBySlug = async (slug) => {
  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    include: {
      products: {
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
      },
    },
  });

  if (!collection) {
    throw new AppError('Collection not found', HTTP_STATUS.NOT_FOUND, 'COLLECTION_NOT_FOUND');
  }

  const activeProducts = collection.products
    .filter((cp) => cp.product.isActive)
    .map((cp) => {
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
    productsCount: activeProducts.length,
    products: activeProducts,
  };
};
