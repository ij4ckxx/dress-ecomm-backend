import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { formatPrice } from '../../utils/pricing.js';
import { parsePagination, formatPagination } from '../../utils/pagination.js';
import { PRODUCT_SORT_OPTIONS } from '../../constants/sortOptions.js';
import { getCache, setCache } from '../../utils/cache.js';

/**
 * Builds a hierarchical tree from a flat list of categories
 * Supports arbitrary depth (3-4+ levels)
 * @param {Array} categories
 * @returns {Array}
 */
const buildCategoryTree = (categories) => {
  const categoryMap = new Map();
  const roots = [];

  // Initialize nodes with an empty children array
  for (const cat of categories) {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      productCount: cat._count?.products ?? 0,
      children: [],
    });
  }

  // Populate children
  for (const cat of categories) {
    const node = categoryMap.get(cat.id);
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      categoryMap.get(cat.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

/**
 * Recursively retrieves a category's ID and all its descendants
 * @param {string} rootCategoryId
 * @returns {Promise<string[]>}
 */
export const getDescendantCategoryIds = async (rootCategoryId) => {
  const allCategories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true },
  });

  const ids = [rootCategoryId];
  const queue = [rootCategoryId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = allCategories.filter((c) => c.parentId === currentId);
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }

  return ids;
};

/**
 * Lists categories (tree hierarchy, root-only, or flat)
 * @param {object} options
 * @param {boolean} [options.tree=false]
 * @param {boolean} [options.rootOnly=false]
 * @returns {Promise<Array>}
 */
export const getCategories = async ({ tree = false, rootOnly = false } = {}) => {
  const cacheKey = `cache:categories:${tree ? 'tree' : rootOnly ? 'root' : 'flat'}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const where = { isActive: true };
  if (rootOnly && !tree) {
    where.parentId = null;
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      sortOrder: true,
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
  });

  const result = tree
    ? buildCategoryTree(categories)
    : categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        productCount: cat._count?.products ?? 0,
      }));

  // Cache categories for 1 hour (3600 seconds)
  await setCache(cacheKey, result, 3600);
  return result;
};

/**
 * Gets a single category with parent breadcrumb and direct children
 * @param {string} slug
 * @returns {Promise<object>}
 */
export const getCategoryBySlug = async (slug) => {
  const cacheKey = `cache:categories:slug:${slug}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      sortOrder: true,
      parent: {
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
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          sortOrder: true,
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
      },
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
  });

  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  }

  const result = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    productCount: category._count?.products ?? 0,
    parent: category.parent,
    children: category.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      imageUrl: child.imageUrl,
      sortOrder: child.sortOrder,
      productCount: child._count?.products ?? 0,
    })),
  };

  await setCache(cacheKey, result, 3600);
  return result;
};

/**
 * Gets lightweight product summaries for a category page (PLP)
 * @param {string} slug
 * @param {object} query
 * @param {string|null} [userId=null]
 * @returns {Promise<{ category: object, products: Array, pagination: object }>}
 */
export const getCategoryProducts = async (slug, query = {}, userId = null) => {
  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  }

  // Include products in this category and all its subcategories (or targeted subcategory if passed)
  let targetCategoryIds;
  if (query.subcategory) {
    const subcat = await prisma.category.findFirst({
      where: {
        OR: [{ slug: query.subcategory.trim() }, { id: query.subcategory.trim() }],
        isActive: true,
      },
      select: { id: true },
    });
    if (subcat) {
      targetCategoryIds = await getDescendantCategoryIds(subcat.id);
    } else {
      targetCategoryIds = ['non_existent_category_id'];
    }
  } else {
    targetCategoryIds = await getDescendantCategoryIds(category.id);
  }

  const { page, limit, skip, take } = parsePagination(query);

  const andConditions = [
    { categoryId: { in: targetCategoryIds } },
    { isActive: true },
  ];

  const search = (query.search || query.q || '').trim();
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  // Brand filter (supports comma-separated list or single value)
  if (query.brand) {
    const brands = query.brand
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    if (brands.length === 1) {
      andConditions.push({
        brand: { equals: brands[0], mode: 'insensitive' },
      });
    } else if (brands.length > 1) {
      andConditions.push({
        brand: { in: brands, mode: 'insensitive' },
      });
    }
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

  // In-stock availability filter
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

  // Minimum rating filter
  if (query.rating !== undefined && query.rating !== '') {
    const minRating = parseFloat(query.rating);
    if (!isNaN(minRating)) {
      andConditions.push({ rating: { gte: minRating } });
    }
  }

  // Generic dynamic attributes filtering (e.g. color=black,red&size=m,l&fabric=silk)
  const KNOWN_KEYS = new Set([
    'page', 'limit', 'sort', 'search', 'q', 'brand', 'minPrice', 'maxPrice',
    'inStock', 'rating', 'subcategory', 'tree', 'rootOnly',
  ]);

  for (const [key, value] of Object.entries(query)) {
    if (!KNOWN_KEYS.has(key) && typeof value === 'string' && value.trim()) {
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
                    attribute: { slug: attrSlug },
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
                        attribute: { slug: attrSlug },
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

  const where = { AND: andConditions };

  // Sorting
  let orderBy = [{ createdAt: 'desc' }];
  switch (query.sort) {
    case PRODUCT_SORT_OPTIONS.NAME_ASC:
      orderBy = [{ name: 'asc' }];
      break;
    case PRODUCT_SORT_OPTIONS.NAME_DESC:
      orderBy = [{ name: 'desc' }];
      break;
    case PRODUCT_SORT_OPTIONS.PRICE_ASC:
      orderBy = [{ regularPrice: 'asc' }];
      break;
    case PRODUCT_SORT_OPTIONS.PRICE_DESC:
      orderBy = [{ regularPrice: 'desc' }];
      break;
    case PRODUCT_SORT_OPTIONS.NEWEST:
      orderBy = [{ createdAt: 'desc' }];
      break;
    case PRODUCT_SORT_OPTIONS.OLDEST:
      orderBy = [{ createdAt: 'asc' }];
      break;
    case PRODUCT_SORT_OPTIONS.BESTSELLING:
      orderBy = [{ totalSold: 'desc' }];
      break;
    case PRODUCT_SORT_OPTIONS.RATING:
      orderBy = [{ rating: 'desc' }];
      break;
    case PRODUCT_SORT_OPTIONS.BEST_DEALS:
      orderBy = [{ salePrice: 'desc' }, { regularPrice: 'asc' }];
      break;
    default:
      orderBy = [{ createdAt: 'desc' }];
  }

  // Execute total count and paginated query in parallel
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
        rating: true,
        reviewCount: true,
        regularPrice: true,
        salePrice: true,
        offerPrice: true,
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

  // Wishlist check for authenticated customer (zero N+1)
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

  // Map to lightweight category listing card format
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
      rating: p.rating,
      reviewCount: p.reviewCount,
      thumbnail: p.images[0]?.url || null,
      secondaryImage: p.images[1]?.url || null,
      price,
      colors,
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
    category,
    products,
    pagination: formatPagination({ total, page, limit }),
  };
};
