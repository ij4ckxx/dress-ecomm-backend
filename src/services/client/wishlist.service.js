import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { addItemToCart } from './cart.service.js';
import { formatPrice } from '../../utils/pricing.js';

/**
 * Converts Decimal or numeric values safely to standard number
 * @param {any} val
 * @returns {number}
 */
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  return Number(val) || 0;
};

/**
 * Retrieves or creates a customer's private wishlist
 * @param {string} userId
 * @param {object} [tx]
 * @returns {Promise<object>}
 */
export const getOrCreateCustomerWishlist = async (userId, tx = prisma) => {
  let wishlist = await tx.wishlist.findUnique({
    where: { userId },
  });

  if (!wishlist) {
    wishlist = await tx.wishlist.create({
      data: { userId },
    });
  }

  return wishlist;
};

/**
 * Retrieves paginated wishlist items with rich product details, prices, and variant options
 * @param {object} params
 * @param {string} params.userId
 * @param {object} params.query
 * @returns {Promise<object>}
 */
export const getCustomerWishlistService = async ({ userId, query }) => {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 10));
  const search = query?.search;
  const sort = query?.sort || query?.sortBy || 'newest';
  const inStock = query?.inStock || 'all';

  const skip = (page - 1) * limit;
  const wishlist = await getOrCreateCustomerWishlist(userId);

  // Build product filters
  const productWhere = {
    isActive: true,
  };

  if (search && search.trim()) {
    productWhere.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { brand: { contains: search.trim(), mode: 'insensitive' } },
      { sku: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  if (inStock === 'true') {
    productWhere.stockQuantity = { gt: 0 };
  } else if (inStock === 'false') {
    productWhere.stockQuantity = { lte: 0 };
  }

  const where = {
    wishlistId: wishlist.id,
    product: productWhere,
  };

  // Sorting
  let orderBy = { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  if (sort === 'price_asc') orderBy = { product: { regularPrice: 'asc' } };
  if (sort === 'price_desc') orderBy = { product: { regularPrice: 'desc' } };
  if (sort === 'name_asc') orderBy = { product: { name: 'asc' } };
  if (sort === 'name_desc') orderBy = { product: { name: 'desc' } };

  const [items, total] = await Promise.all([
    prisma.wishlistItem.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            images: {
              select: { id: true, url: true, isThumbnail: true, altText: true },
              orderBy: { isThumbnail: 'desc' },
            },
            variants: {
              where: { isActive: true },
              select: {
                id: true,
                sku: true,
                name: true,
                stockQuantity: true,
                regularPrice: true,
                salePrice: true,
                offerPrice: true,
                attributes: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.wishlistItem.count({ where }),
  ]);

  const formattedItems = items.map((item) => {
    const p = item.product;
    const priceFormatted = formatPrice(p.regularPrice, p.salePrice, p.offerPrice);

    // Collect available sizes & colors from variants
    const availableSizes = new Set();
    const availableColors = new Set();
    let totalVariantStock = 0;

    for (const v of p.variants) {
      totalVariantStock += v.stockQuantity;
      if (v.attributes) {
        for (const attr of v.attributes) {
          const slug = attr.attributeValue?.attribute?.slug?.toLowerCase();
          const val = attr.attributeValue?.value;
          if (slug === 'size' && val) availableSizes.add(val);
          if (slug === 'color' && val) availableColors.add(val);
        }
      }
    }

    const effectiveStock = p.variants.length > 0 ? totalVariantStock : p.stockQuantity;
    const isOutOfStock = effectiveStock <= 0;

    const thumbnail =
      p.images.find((img) => img.isThumbnail)?.url || p.images[0]?.url || null;

    return {
      wishlistItemId: item.id,
      productId: p.id,
      addedAt: item.createdAt,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      sku: p.sku,
      thumbnail,
      images: p.images,
      category: p.category,
      hasVariants: p.variants.length > 0,
      availableSizes: Array.from(availableSizes),
      availableColors: Array.from(availableColors),
      variantsCount: p.variants.length,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        stockQuantity: v.stockQuantity,
        price: formatPrice(v.regularPrice ?? p.regularPrice, v.salePrice ?? p.salePrice, v.offerPrice ?? p.offerPrice),
        attributes: v.attributes.map((a) => ({
          attribute: a.attributeValue.attribute.name,
          attributeSlug: a.attributeValue.attribute.slug,
          value: a.attributeValue.value,
        })),
      })),
      stockQuantity: effectiveStock,
      isOutOfStock,
      pricing: {
        regularPrice: toNumber(priceFormatted.regular),
        salePrice: priceFormatted.sale !== null ? toNumber(priceFormatted.sale) : null,
        offerPrice: priceFormatted.offer !== null ? toNumber(priceFormatted.offer) : null,
        effectivePrice: toNumber(priceFormatted.effective),
        discountPercentage: priceFormatted.discountPercentage,
        currency: 'INR',
      },
    };
  });

  return {
    wishlistId: wishlist.id,
    items: formattedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Adds a product to the customer's wishlist (Idempotent)
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.productId
 * @returns {Promise<object>}
 */
export const addToWishlistService = async ({ userId, productId }) => {
  // Verify product exists and is active
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, isActive: true },
  });

  if (!product || !product.isActive) {
    throw new AppError('Product not found or inactive', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  const wishlist = await getOrCreateCustomerWishlist(userId);

  // Check if product is already in wishlist
  const existingItem = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_productId: {
        wishlistId: wishlist.id,
        productId,
      },
    },
  });

  if (existingItem) {
    return {
      isNew: false,
      message: 'Product is already in your wishlist',
      item: existingItem,
    };
  }

  const newItem = await prisma.wishlistItem.create({
    data: {
      wishlistId: wishlist.id,
      productId,
    },
  });

  return {
    isNew: true,
    message: 'Product added to wishlist successfully',
    item: newItem,
  };
};

/**
 * Removes a product from customer's wishlist
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.productId
 * @returns {Promise<object>}
 */
export const removeFromWishlistService = async ({ userId, productId }) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
  });

  if (!wishlist) {
    throw new AppError('Product not found in your wishlist', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
  }

  const existingItem = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_productId: {
        wishlistId: wishlist.id,
        productId,
      },
    },
  });

  if (!existingItem) {
    throw new AppError('Product not found in your wishlist', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
  }

  await prisma.wishlistItem.delete({
    where: { id: existingItem.id },
  });

  return {
    success: true,
    message: 'Product removed from wishlist successfully',
  };
};

/**
 * Toggles product in customer's wishlist (convenience for PDP/Card hearts)
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.productId
 * @returns {Promise<object>}
 */
export const toggleWishlistService = async ({ userId, productId }) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, isActive: true },
  });

  if (!product || !product.isActive) {
    throw new AppError('Product not found or inactive', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  const wishlist = await getOrCreateCustomerWishlist(userId);

  const existingItem = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_productId: {
        wishlistId: wishlist.id,
        productId,
      },
    },
  });

  if (existingItem) {
    await prisma.wishlistItem.delete({
      where: { id: existingItem.id },
    });
    return {
      inWishlist: false,
      message: 'Product removed from wishlist',
      productId,
    };
  }

  await prisma.wishlistItem.create({
    data: {
      wishlistId: wishlist.id,
      productId,
    },
  });

  return {
    inWishlist: true,
    message: 'Product added to wishlist',
    productId,
  };
};

/**
 * Clears all items from customer's wishlist
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const clearWishlistService = async (userId) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
  });

  if (wishlist) {
    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id },
    });
  }

  return {
    success: true,
    message: 'Wishlist cleared successfully',
  };
};

/**
 * Fast lookup returning array of wishlisted product IDs for frontend heart highlighting
 * @param {string} userId
 * @returns {Promise<string[]>} Array of product IDs
 */
export const getWishlistProductIdsService = async (userId) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        select: { productId: true },
      },
    },
  });

  if (!wishlist) return [];
  return wishlist.items.map((item) => item.productId);
};

/**
 * Adds or moves a wishlisted product into customer's active cart
 * Validates stock, adds via standard cart engine, and removes from wishlist if requested
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.productId
 * @param {object} params.payload
 * @returns {Promise<object>}
 */
export const wishlistAddToCartService = async ({ userId, productId, payload }) => {
  const { variantId = null, quantity = 1, moveToCart = false } = payload;

  // 1. Verify product existence and variant requirements
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: { where: { isActive: true } },
    },
  });

  if (!product || !product.isActive) {
    throw new AppError('Product is no longer available', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  // If product has variants but customer didn't specify one
  if (product.variants.length > 0 && !variantId) {
    throw new AppError(
      'Please select a size or color variant before adding this product to cart',
      HTTP_STATUS.BAD_REQUEST,
      'VARIANT_SELECTION_REQUIRED'
    );
  }

  // 2. Add item using authoritative cart service
  const cartResult = await addItemToCart(
    { userId },
    {
      productId,
      variantId,
      quantity,
    }
  );

  // 3. If moveToCart is true, remove from wishlist after successful cart addition
  if (moveToCart) {
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (wishlist) {
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id, productId },
      });
    }
  }

  return {
    message: moveToCart ? 'Item moved to cart successfully' : 'Item added to cart successfully',
    cart: cartResult,
    moved: moveToCart,
  };
};
