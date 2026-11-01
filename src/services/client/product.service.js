import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { formatPrice } from '../../utils/pricing.js';
import { parsePagination, formatPagination } from '../../utils/pagination.js';
import { PRODUCT_SORT_OPTIONS } from '../../constants/sortOptions.js';
import { getDescendantCategoryIds } from './category.service.js';
import { getCache, setCache } from '../../utils/cache.js';

const KNOWN_QUERY_KEYS = new Set([
  'page',
  'limit',
  'search',
  'q',
  'category',
  'brand',
  'minPrice',
  'maxPrice',
  'sort',
  'isFeatured',
  'inStock',
  'rating',
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
  const search = (query.search || query.q || '').trim();
  if (search) {
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

  // In-stock availability filter (supports root stock or active variant stocks)
  if (query.inStock !== undefined && query.inStock !== '') {
    const isInStock = query.inStock === true || query.inStock === 'true' || query.inStock === '1';
    if (isInStock) {
      andConditions.push({
        OR: [
          { stockQuantity: { gt: 0 } },
          { variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } },
        ],
      });
    }
  }

  // Minimum rating filter (e.g., rating=4 for 4★ & above)
  if (query.rating !== undefined && query.rating !== '') {
    const minRating = parseFloat(query.rating);
    if (!isNaN(minRating)) {
      andConditions.push({ rating: { gte: minRating } });
    }
  }

  // Generic dynamic attributes filtering (e.g., ?color=black,red&size=xl,l&fabric=silk)
  // Supports both direct product attributes and variant attributes with multi-value comma separation
  for (const [key, value] of Object.entries(query)) {
    if (!KNOWN_QUERY_KEYS.has(key) && typeof value === 'string' && value.trim()) {
      const attrSlug = key.trim().toLowerCase();
      const valSlugs = value
        .trim()
        .toLowerCase()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (valSlugs.length > 0) {
        andConditions.push({
          OR: [
            {
              attributes: {
                some: {
                  attributeValue: {
                    slug: { in: valSlugs },
                    attribute: {
                      slug: attrSlug,
                    },
                  },
                },
              },
            },
            {
              variants: {
                some: {
                  isActive: true,
                  attributes: {
                    some: {
                      attributeValue: {
                        slug: { in: valSlugs },
                        attribute: {
                          slug: attrSlug,
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        });
      }
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
          take: 2,
          select: { url: true },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            attributes: {
              select: {
                attributeValue: {
                  select: {
                    value: true,
                    slug: true,
                    attribute: { select: { slug: true } },
                  },
                },
              },
            },
          },
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

    // Extract distinct color swatches
    const colors = [];
    const seenColors = new Set();
    p.variants.forEach((v) => {
      v.attributes?.forEach((a) => {
        const val = a.attributeValue;
        if (val && val.attribute?.slug === 'color' && !seenColors.has(val.slug)) {
          seenColors.add(val.slug);
          colors.push({ name: val.value, slug: val.slug });
        }
      });
    });

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      thumbnail: p.images[0]?.url || null,
      secondaryImage: p.images[1]?.url || null,
      price,
      colors,
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
  const cacheKey = `cache:product:slug:${slug}`;
  let baseProduct = await getCache(cacheKey);

  if (!baseProduct) {
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
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                priceDelta: true,
                isDefault: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
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
      displayName: group.displayName || group.name,
      type: group.type,
      defaultValue: group.defaultValue || null,
      config: group.config || {},
      isRequired: group.isRequired,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      sortOrder: group.sortOrder,
      options: group.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        priceDelta: typeof opt.priceDelta?.toNumber === 'function' ? opt.priceDelta.toNumber() : Number(opt.priceDelta),
        isDefault: opt.isDefault,
        sortOrder: opt.sortOrder,
      })),
    }));

    const hasVariants = variants.length > 0;
    const hasModifiers = modifierGroups.length > 0;
    const requiresConfiguration = hasVariants || hasModifiers;

    // In-stock status check
    const inStock = product.stockQuantity > 0 || variants.some((v) => v.inStock);

    baseProduct = {
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
      images: product.images,
      variants,
      attributes,
      modifierGroups,
    };

    // Cache product details for 30 minutes (1800 seconds)
    await setCache(cacheKey, baseProduct, 1800);
  }

  // Wishlist check (per user)
  let isWishlisted = false;
  if (userId && baseProduct?.id) {
    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlist: { userId },
        productId: baseProduct.id,
      },
      select: { id: true },
    });
    isWishlisted = Boolean(wishlistItem);
  }

  return {
    ...baseProduct,
    isWishlisted,
  };
};

/**
 * Retrieves dynamic catalog filter options (facets) for storefront sidebar rendering:
 * - Scoped by category and/or search term, brand, price, inStock, and rating
 * - Returns accurate deduplicated product counts across product-level and variant-level attributes
 * - Dynamic price boundaries (min and max)
 * - Active brand lists with item counts
 * - Subcategories with product counts
 * - Availability (in-stock vs out-of-stock)
 * - Ratings breakdown
 * - High-speed caching (5 minutes TTL)
 *
 * @param {object} query
 * @param {string} [query.category] - Category slug or UUID
 * @param {string} [query.search] - Search keyword
 * @param {string} [query.brand] - Specific brand
 * @param {number|string} [query.minPrice] - Minimum price filter
 * @param {number|string} [query.maxPrice] - Maximum price filter
 * @param {boolean|string} [query.inStock] - In-stock filter
 * @param {number|string} [query.rating] - Minimum rating filter
 * @returns {Promise<object>}
 */
export const getProductFilters = async (query = {}) => {
  const catSlug = query.category?.trim() || null;
  const search = (query.search || query.q)?.trim() || null;
  const brand = query.brand?.trim() || null;
  const queryMinPrice = query.minPrice !== undefined && query.minPrice !== '' ? parseFloat(query.minPrice) : null;
  const queryMaxPrice = query.maxPrice !== undefined && query.maxPrice !== '' ? parseFloat(query.maxPrice) : null;
  const inStock = query.inStock !== undefined && query.inStock !== '' ? (query.inStock === true || query.inStock === 'true' || query.inStock === '1') : null;
  const rating = query.rating !== undefined && query.rating !== '' ? parseFloat(query.rating) : null;

  // Normalized cache key
  const cacheKey = `cache:product:filters:${catSlug || 'all'}:${search ? search.toLowerCase() : 'all'}:${brand ? brand.toLowerCase() : 'all'}:${queryMinPrice ?? 'all'}:${queryMaxPrice ?? 'all'}:${inStock ?? 'all'}:${rating ?? 'all'}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // 1. Resolve Category Scope
  let matchedCategory = null;
  let categoryIds = null;
  if (catSlug) {
    matchedCategory = await prisma.category.findFirst({
      where: {
        OR: [{ slug: catSlug }, { id: catSlug }],
        isActive: true,
      },
      select: { id: true, name: true, slug: true, parentId: true },
    });

    if (matchedCategory) {
      categoryIds = await getDescendantCategoryIds(matchedCategory.id);
    } else {
      categoryIds = ['non_existent_category_id'];
    }
  }

  // 2. Fetch Relevant Subcategories / Root Categories for Sidebar Tree
  let categoriesToList = [];
  if (matchedCategory) {
    // Look for child categories first
    const childCategories = await prisma.category.findMany({
      where: {
        parentId: matchedCategory.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // If it's a leaf category (no children) and has a parent, show siblings
    if (childCategories.length === 0 && matchedCategory.parentId) {
      categoriesToList = await prisma.category.findMany({
        where: {
          parentId: matchedCategory.parentId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          _count: {
            select: {
              products: {
                where: { isActive: true },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });
    } else {
      categoriesToList = childCategories;
    }
  } else {
    // If no category specified, return root categories
    categoriesToList = await prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  const categories = categoriesToList.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
  }));

  // 3. Build Base Where Clauses for Active Matching Products
  // Scope conditions: category, search keyword, and brand
  const scopeConditions = [];

  if (categoryIds) {
    scopeConditions.push({ categoryId: { in: categoryIds } });
  }

  if (search) {
    scopeConditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  if (brand) {
    scopeConditions.push({
      brand: { equals: brand, mode: 'insensitive' },
    });
  }

  // Catalog scope where (for broad category/search price slider bounds)
  const catalogWhere = {
    isActive: true,
  };
  if (scopeConditions.length > 0) {
    catalogWhere.AND = scopeConditions;
  }

  // Refined where for active drill-down filters (minPrice, maxPrice, inStock, rating)
  const baseWhere = {
    isActive: true,
  };
  const andConditions = [...scopeConditions];

  if (queryMinPrice !== null && !isNaN(queryMinPrice)) {
    andConditions.push({ regularPrice: { gte: queryMinPrice } });
  }

  if (queryMaxPrice !== null && !isNaN(queryMaxPrice)) {
    andConditions.push({ regularPrice: { lte: queryMaxPrice } });
  }

  if (inStock) {
    andConditions.push({
      OR: [
        { stockQuantity: { gt: 0 } },
        { variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } },
      ],
    });
  }

  if (rating !== null && !isNaN(rating)) {
    andConditions.push({ rating: { gte: rating } });
  }

  if (andConditions.length > 0) {
    baseWhere.AND = andConditions;
  }

  // 4. Fetch Aggregate Metrics (Price bounds, stock quantities, and matching products)
  const [priceAgg, inStockCount, outOfStockCount, matchingProducts] = await Promise.all([
    prisma.product.aggregate({
      where: catalogWhere,
      _min: { regularPrice: true, salePrice: true, offerPrice: true },
      _max: { regularPrice: true, salePrice: true, offerPrice: true },
      _count: { _all: true },
    }),
    prisma.product.count({
      where: {
        ...baseWhere,
        OR: [
          { stockQuantity: { gt: 0 } },
          { variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } },
        ],
      },
    }),
    prisma.product.count({
      where: {
        ...baseWhere,
        stockQuantity: { lte: 0 },
        variants: { none: { isActive: true, stockQuantity: { gt: 0 } } },
      },
    }),
    prisma.product.findMany({
      where: baseWhere,
      select: {
        id: true,
        brand: true,
        rating: true,
      },
    }),
  ]);

  const totalProducts = matchingProducts.length;

  // Compute clean price bounds from catalog scope
  let minPrice = 0;
  let maxPrice = 0;
  if (priceAgg._count._all > 0) {
    const regularMin = priceAgg._min.regularPrice ? Number(priceAgg._min.regularPrice) : 0;
    const saleMin = priceAgg._min.salePrice ? Number(priceAgg._min.salePrice) : regularMin;
    const offerMin = priceAgg._min.offerPrice ? Number(priceAgg._min.offerPrice) : saleMin;
    minPrice = Math.min(regularMin, saleMin, offerMin);

    const regularMax = priceAgg._max.regularPrice ? Number(priceAgg._max.regularPrice) : 0;
    const saleMax = priceAgg._max.salePrice ? Number(priceAgg._max.salePrice) : regularMax;
    const offerMax = priceAgg._max.offerPrice ? Number(priceAgg._max.offerPrice) : saleMax;
    maxPrice = Math.max(regularMax, saleMax, offerMax);
  }

  // 5. Aggregate Brands with item counts
  const brandCountMap = new Map();
  for (const p of matchingProducts) {
    if (p.brand && p.brand.trim()) {
      const bName = p.brand.trim();
      brandCountMap.set(bName, (brandCountMap.get(bName) || 0) + 1);
    }
  }
  const brands = Array.from(brandCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // 6. Ratings Summary
  const ratingsSummary = [
    { rating: 4, label: '4★ & above', count: matchingProducts.filter((p) => p.rating >= 4).length },
    { rating: 3, label: '3★ & above', count: matchingProducts.filter((p) => p.rating >= 3).length },
  ];

  // 7. Aggregate Dynamic Filterable Attributes (Color, Size, Fabric, Occasion, etc.)
  const matchingProductIds = matchingProducts.map((p) => p.id);

  const allFilterableAttributes = await prisma.attribute.findMany({
    where: { isFilterable: true },
    include: {
      values: {
        select: {
          id: true,
          value: true,
          slug: true,
        },
        orderBy: { value: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  let directAttrValues = [];
  let variantAttrValues = [];

  if (matchingProductIds.length > 0) {
    [directAttrValues, variantAttrValues] = await Promise.all([
      prisma.productAttributeValue.findMany({
        where: { productId: { in: matchingProductIds } },
        select: {
          productId: true,
          attributeValueId: true,
        },
      }),
      prisma.productVariantAttribute.findMany({
        where: {
          variant: {
            productId: { in: matchingProductIds },
            isActive: true,
          },
        },
        select: {
          variant: { select: { productId: true } },
          attributeValueId: true,
        },
      }),
    ]);
  }

  // Map: attributeValueId -> Set of unique productIds
  const attrValueProductSets = new Map();

  for (const dav of directAttrValues) {
    if (!attrValueProductSets.has(dav.attributeValueId)) {
      attrValueProductSets.set(dav.attributeValueId, new Set());
    }
    attrValueProductSets.get(dav.attributeValueId).add(dav.productId);
  }

  for (const vav of variantAttrValues) {
    if (!attrValueProductSets.has(vav.attributeValueId)) {
      attrValueProductSets.set(vav.attributeValueId, new Set());
    }
    attrValueProductSets.get(vav.attributeValueId).add(vav.variant.productId);
  }

  const attributes = allFilterableAttributes
    .map((attr) => {
      const values = attr.values
        .map((v) => {
          const productSet = attrValueProductSets.get(v.id);
          const count = productSet ? productSet.size : 0;
          return {
            id: v.id,
            name: v.value,
            slug: v.slug,
            count,
          };
        })
        .filter((v) => v.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      return {
        id: attr.id,
        name: attr.name,
        slug: attr.slug,
        values,
      };
    })
    .filter((attr) => attr.values.length > 0);

  // 8. Assemble Full Filter Response
  const filterResult = {
    totalProducts,
    category: matchedCategory
      ? {
          id: matchedCategory.id,
          name: matchedCategory.name,
          slug: matchedCategory.slug,
        }
      : null,
    priceRange: {
      min: minPrice,
      max: maxPrice,
    },
    categories,
    brands,
    attributes,
    ratings: ratingsSummary,
    availability: {
      inStock: inStockCount,
      outOfStock: outOfStockCount,
    },
  };

  // Cache filter options for 5 minutes (300 seconds)
  await setCache(cacheKey, filterResult, 300);

  return filterResult;
};
