import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { formatPrice } from '../../utils/pricing.js';
import { parsePagination, formatPagination } from '../../utils/pagination.js';
import { PRODUCT_SORT_OPTIONS } from '../../constants/sortOptions.js';
import { getDescendantCategoryIds } from './category.service.js';

const KNOWN_QUERY_KEYS = new Set([
  'page',
  'limit',
  'search',
  'category',
  'brand',
  'minPrice',
  'maxPrice',
  'sort',
  'isFeatured',
]);

/**
 * Builds Prisma sort expression from sort key
 * @param {string} sortKey
 * @returns {Array}
 */
const buildSortOrder = (sortKey) => {
  switch (sortKey) {
    case PRODUCT_SORT_OPTIONS.NAME_ASC:
      return [{ name: 'asc' }];
    case PRODUCT_SORT_OPTIONS.NAME_DESC:
      return [{ name: 'desc' }];
    case PRODUCT_SORT_OPTIONS.PRICE_ASC:
      return [{ regularPrice: 'asc' }];
    case PRODUCT_SORT_OPTIONS.PRICE_DESC:
      return [{ regularPrice: 'desc' }];
    case PRODUCT_SORT_OPTIONS.NEWEST:
      return [{ createdAt: 'desc' }];
    case PRODUCT_SORT_OPTIONS.OLDEST:
      return [{ createdAt: 'asc' }];
    case PRODUCT_SORT_OPTIONS.BESTSELLING:
      return [{ totalSold: 'desc' }];
    case PRODUCT_SORT_OPTIONS.RATING:
      return [{ rating: 'desc' }];
    case PRODUCT_SORT_OPTIONS.BEST_DEALS:
      return [{ salePrice: 'desc' }, { regularPrice: 'asc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
};

/**
 * Lists & discovers products with search, filters, dynamic attributes, sorting, and pagination
 * @param {object} query
 * @param {string|null} [userId=null]
 * @returns {Promise<{ products: Array, pagination: object }>}
 */
export const getProducts = async (query = {}, userId = null) => {
  const { page, limit, skip, take } = parsePagination(query);

  const where = {
    isActive: true,
  };

  const andConditions = [];

  // Search across product name, description, brand, SKU, and category name
  if (query.search) {
    const search = query.search.trim();
    andConditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  // Category filter (by slug or ID)
  if (query.category) {
    const catSlug = query.category.trim();
    const matchedCategory = await prisma.category.findFirst({
      where: {
        OR: [{ slug: catSlug }, { id: catSlug }],
        isActive: true,
      },
      select: { id: true },
    });

    if (matchedCategory) {
      const categoryIds = await getDescendantCategoryIds(matchedCategory.id);
      andConditions.push({ categoryId: { in: categoryIds } });
    } else {
      // Non-existent category filter produces empty result safely
      andConditions.push({ categoryId: 'non_existent_category_id' });
    }
  }

  // Brand filter
  if (query.brand) {
    andConditions.push({
      brand: { equals: query.brand.trim(), mode: 'insensitive' },
    });
  }

  // Price range filters
  if (query.minPrice !== undefined && query.minPrice !== '') {
    const min = parseFloat(query.minPrice);
    if (!isNaN(min)) {
      andConditions.push({ regularPrice: { gte: min } });
    }
  }

  if (query.maxPrice !== undefined && query.maxPrice !== '') {
    const max = parseFloat(query.maxPrice);
    if (!isNaN(max)) {
      andConditions.push({ regularPrice: { lte: max } });
    }
  }

  // Featured flag
  if (query.isFeatured !== undefined) {
    andConditions.push({ isFeatured: Boolean(query.isFeatured) });
  }

  // Generic dynamic attributes filtering (e.g., ?color=black&size=xl&material=silk)
  for (const [key, value] of Object.entries(query)) {
    if (!KNOWN_QUERY_KEYS.has(key) && typeof value === 'string' && value.trim()) {
      const attrSlug = key.trim().toLowerCase();
      const valSlug = value.trim().toLowerCase();

      andConditions.push({
        attributes: {
          some: {
            attributeValue: {
              slug: valSlug,
              attribute: {
                slug: attrSlug,
              },
            },
          },
        },
      });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const orderBy = buildSortOrder(query.sort);

  // Execute count and product query in parallel
  const [total, rawProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        regularPrice: true,
        salePrice: true,
        offerPrice: true,
        rating: true,
        reviewCount: true,
        totalSold: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { url: true },
        },
        variants: {
          where: { isActive: true },
          take: 1,
          select: { id: true },
        },
        modifierGroups: {
          take: 1,
          select: { id: true },
        },
      },
    }),
  ]);

  // Wishlist check for authenticated customer (single query, O(1) set lookup)
  let wishlistedProductIds = new Set();
  if (userId && rawProducts.length > 0) {
    const userWishlist = await prisma.wishlistItem.findMany({
      where: {
        wishlist: { userId },
        productId: { in: rawProducts.map((p) => p.id) },
      },
      select: { productId: true },
    });
    wishlistedProductIds = new Set(userWishlist.map((item) => item.productId));
  }

  const products = rawProducts.map((p) => {
    const hasVariants = p.variants.length > 0;
    const hasModifiers = p.modifierGroups.length > 0;
    const requiresConfiguration = hasVariants || hasModifiers;
    const price = formatPrice(p.regularPrice, p.salePrice, p.offerPrice);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      thumbnail: p.images[0]?.url || null,
      price,
      rating: p.rating,
      reviewCount: p.reviewCount,
      hasVariants,
      hasModifiers,
      requiresConfiguration,
      isWishlisted: wishlistedProductIds.has(p.id),
    };
  });

  if (query.sort === PRODUCT_SORT_OPTIONS.BEST_DEALS) {
    products.sort((a, b) => b.price.discountPercentage - a.price.discountPercentage);
  }

  return {
    products,
    pagination: formatPagination({ total, page, limit }),
  };
};

/**
 * Gets complete product details by slug
 * @param {string} slug
 * @param {string|null} [userId=null]
 * @returns {Promise<object>}
 */
export const getProductBySlug = async (slug, userId = null) => {
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      images: {
        orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          url: true,
          altText: true,
          isThumbnail: true,
          sortOrder: true,
          variantId: true,
        },
      },
      attributes: {
        select: {
          attributeValue: {
            select: {
              id: true,
              value: true,
              slug: true,
              attribute: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          images: {
            select: {
              id: true,
              url: true,
              altText: true,
            },
          },
          attributes: {
            select: {
              attributeValue: {
                select: {
                  value: true,
                  slug: true,
                  attribute: {
                    select: {
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      modifierGroups: {
        orderBy: { createdAt: 'asc' },
        include: {
          options: {
            orderBy: { priceDelta: 'asc' },
            select: {
              id: true,
              name: true,
              priceDelta: true,
              isDefault: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  // Wishlist check
  let isWishlisted = false;
  if (userId) {
    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlist: { userId },
        productId: product.id,
      },
      select: { id: true },
    });
    isWishlisted = Boolean(wishlistItem);
  }

  // Format base pricing
  const basePrice = formatPrice(product.regularPrice, product.salePrice, product.offerPrice);

  // Format variants with variant-specific pricing
  const variants = product.variants.map((v) => {
    // If variant doesn't have an explicit price, inherit product base price
    const varReg = v.regularPrice ?? product.regularPrice;
    const varSale = v.salePrice ?? null;
    const varOffer = v.offerPrice ?? null;

    const variantPrice = formatPrice(varReg, varSale, varOffer);

    const attributes = v.attributes.map((a) => ({
      attribute: a.attributeValue.attribute.name,
      attributeSlug: a.attributeValue.attribute.slug,
      value: a.attributeValue.value,
      valueSlug: a.attributeValue.slug,
    }));

    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      price: variantPrice,
      stockQuantity: v.stockQuantity,
      inStock: v.stockQuantity > 0,
      images: v.images,
      attributes,
    };
  });

  // Format dynamic attributes
  const attributes = product.attributes.map((attr) => ({
    attribute: attr.attributeValue.attribute.name,
    attributeSlug: attr.attributeValue.attribute.slug,
    value: attr.attributeValue.value,
    valueSlug: attr.attributeValue.slug,
  }));

  // Format modifiers
  const modifierGroups = product.modifierGroups.map((group) => ({
    id: group.id,
    name: group.name,
    isRequired: group.isRequired,
    minSelection: group.minSelection,
    maxSelection: group.maxSelection,
    options: group.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      priceDelta: typeof opt.priceDelta?.toNumber === 'function' ? opt.priceDelta.toNumber() : Number(opt.priceDelta),
      isDefault: opt.isDefault,
    })),
  }));

  const hasVariants = variants.length > 0;
  const hasModifiers = modifierGroups.length > 0;
  const requiresConfiguration = hasVariants || hasModifiers;

  // In-stock status check
  const inStock = product.stockQuantity > 0 || variants.some((v) => v.inStock);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    sku: product.sku,
    category: product.category,
    price: basePrice,
    stockQuantity: product.stockQuantity,
    inStock,
    rating: product.rating,
    reviewCount: product.reviewCount,
    hasVariants,
    hasModifiers,
    requiresConfiguration,
    isWishlisted,
    images: product.images,
    variants,
    attributes,
    modifierGroups,
  };
};
