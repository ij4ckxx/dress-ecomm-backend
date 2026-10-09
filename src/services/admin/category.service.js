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
 * Builds a nested category tree from flat categories
 */
const buildTree = (categories) => {
  const map = new Map();
  const roots = [];

  for (const cat of categories) {
    map.set(cat.id, {
      ...cat,
      children: [],
    });
  }

  for (const cat of categories) {
    const node = map.get(cat.id);
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

/**
 * Recursively retrieves all descendant IDs of a category
 */
const getDescendantIds = async (categoryId) => {
  const allCategories = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });

  const descendantIds = new Set();
  const queue = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    for (const cat of allCategories) {
      if (cat.parentId === currentId && !descendantIds.has(cat.id)) {
        descendantIds.add(cat.id);
        queue.push(cat.id);
      }
    }
  }

  return Array.from(descendantIds);
};

/**
 * Builds full ancestor breadcrumbs from a category to the root
 */
const getAncestors = async (category) => {
  const ancestors = [];
  let currentParentId = category.parentId;

  while (currentParentId) {
    const parent = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { id: true, name: true, slug: true, parentId: true },
    });

    if (!parent) break;
    ancestors.unshift({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
    });
    currentParentId = parent.parentId;
  }

  return ancestors;
};

/**
 * Retrieves admin categories in tree, flat, or root-only view
 */
export const getCategoriesService = async ({ query }) => {
  const { view = 'tree', search, isActive, isFeatured, parentId, page = 1, limit = 50 } = query;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (isFeatured !== undefined) where.isFeatured = isFeatured;
  if (parentId !== undefined) where.parentId = parentId;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // 1. Tree View (Default)
  if (view === 'tree') {
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    const tree = buildTree(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        isFeatured: cat.isFeatured,
        isActive: cat.isActive,
        productCount: cat._count.products,
        childrenCount: cat._count.children,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      }))
    );

    return {
      view: 'tree',
      data: tree,
      totalCount: categories.length,
    };
  }

  // 2. Root-only View
  if (view === 'root') {
    where.parentId = null;
    const rootCategories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    return {
      view: 'root',
      data: rootCategories.map((cat) => ({
        ...cat,
        productCount: cat._count.products,
        childrenCount: cat._count.children,
      })),
      totalCount: rootCategories.length,
    };
  }

  // 3. Flat Paginated View
  const skip = (page - 1) * limit;
  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { products: true, children: true },
        },
      },
    }),
    prisma.category.count({ where }),
  ]);

  return {
    view: 'flat',
    data: categories.map((cat) => ({
      ...cat,
      productCount: cat._count.products,
      childrenCount: cat._count.children,
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
 * Retrieves a single category by ID with breadcrumbs and direct children
 */
export const getCategoryByIdService = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: {
        select: { id: true, name: true, slug: true, parentId: true },
      },
      children: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { products: true, children: true } },
        },
      },
      _count: {
        select: { products: true, children: true },
      },
    },
  });

  if (!category) {
    throw createServiceError('Category not found', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  }

  const breadcrumbs = await getAncestors(category);

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    isFeatured: category.isFeatured,
    isActive: category.isActive,
    productCount: category._count.products,
    childrenCount: category._count.children,
    parent: category.parent,
    breadcrumbs,
    children: category.children.map((ch) => ({
      id: ch.id,
      name: ch.name,
      slug: ch.slug,
      description: ch.description,
      imageUrl: ch.imageUrl,
      sortOrder: ch.sortOrder,
      isFeatured: ch.isFeatured,
      isActive: ch.isActive,
      productCount: ch._count.products,
      childrenCount: ch._count.children,
    })),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

/**
 * Creates a new category with duplicate prevention and safe slug generation
 */
export const createCategoryService = async (data) => {
  const { name, slug, description, imageUrl, parentId, sortOrder = 0, isFeatured = false, isActive = true } = data;

  // 1. Verify parent existence if parentId provided
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, name: true },
    });
    if (!parent) {
      throw createServiceError('Parent category not found', HTTP_STATUS.NOT_FOUND, 'PARENT_CATEGORY_NOT_FOUND');
    }
  }

  // 2. Prevent duplicate name under the same parent
  const duplicateSibling = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      parentId: parentId || null,
    },
    select: { id: true },
  });

  if (duplicateSibling) {
    throw createServiceError(
      `A category named "${name}" already exists under this parent level.`,
      HTTP_STATUS.CONFLICT,
      'DUPLICATE_CATEGORY_NAME'
    );
  }

  // 3. Generate collision-free slug
  const resolvedSlug = await generateUniqueSlug(prisma.category, slug || name);

  // 4. Save in DB
  const newCategory = await prisma.category.create({
    data: {
      name,
      slug: resolvedSlug,
      description: description || null,
      imageUrl: imageUrl || null,
      parentId: parentId || null,
      sortOrder,
      isFeatured,
      isActive,
    },
    include: {
      parent: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return newCategory;
};

/**
 * Updates a category with circular hierarchy prevention
 */
export const updateCategoryService = async (id, data) => {
  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing) {
    throw createServiceError('Category not found', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  }

  const dataToUpdate = {};

  // 1. Handle parentId update with circular relationship guard
  if (data.parentId !== undefined) {
    if (data.parentId === id) {
      throw createServiceError(
        'A category cannot be its own parent.',
        HTTP_STATUS.BAD_REQUEST,
        'CIRCULAR_HIERARCHY_SELF'
      );
    }

    if (data.parentId !== null) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
        select: { id: true },
      });
      if (!parent) {
        throw createServiceError('Parent category not found', HTTP_STATUS.NOT_FOUND, 'PARENT_CATEGORY_NOT_FOUND');
      }

      // Check if candidate parent is a descendant of the current category
      const descendants = await getDescendantIds(id);
      if (descendants.includes(data.parentId)) {
        throw createServiceError(
          'Circular hierarchy detected: You cannot select a subcategory as a parent.',
          HTTP_STATUS.BAD_REQUEST,
          'CIRCULAR_HIERARCHY_DESCENDANT'
        );
      }
    }
    dataToUpdate.parentId = data.parentId;
  }

  // 2. Handle name and slug
  if (data.name) {
    dataToUpdate.name = data.name;

    // Check sibling duplicate
    const currentParentId = data.parentId !== undefined ? data.parentId : existing.parentId;
    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        name: { equals: data.name, mode: 'insensitive' },
        parentId: currentParentId,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw createServiceError(
        `A category named "${data.name}" already exists under this parent level.`,
        HTTP_STATUS.CONFLICT,
        'DUPLICATE_CATEGORY_NAME'
      );
    }
  }

  if (data.slug) {
    dataToUpdate.slug = await generateUniqueSlug(prisma.category, data.slug, id);
  } else if (data.name && data.name !== existing.name) {
    dataToUpdate.slug = await generateUniqueSlug(prisma.category, data.name, id);
  }

  if (data.description !== undefined) dataToUpdate.description = data.description;
  if (data.imageUrl !== undefined) dataToUpdate.imageUrl = data.imageUrl;
  if (data.sortOrder !== undefined) dataToUpdate.sortOrder = data.sortOrder;
  if (data.isFeatured !== undefined) dataToUpdate.isFeatured = data.isFeatured;
  if (data.isActive !== undefined) dataToUpdate.isActive = data.isActive;

  const updated = await prisma.category.update({
    where: { id },
    data: dataToUpdate,
    include: {
      parent: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: { products: true, children: true },
      },
    },
  });

  return {
    ...updated,
    productCount: updated._count.products,
    childrenCount: updated._count.children,
  };
};

/**
 * Deletes a category with safeguards against orphaned products/subcategories
 */
export const deleteCategoryService = async (id, { force = false } = {}) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true, children: true },
      },
    },
  });

  if (!category) {
    throw createServiceError('Category not found', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  }

  const { products: productCount, children: childrenCount } = category._count;

  // Safety checks if force is not requested
  if (!force) {
    if (productCount > 0) {
      throw createServiceError(
        `Cannot delete category "${category.name}" because it contains ${productCount} active product(s). Please reassign or remove these products first, or deactivate the category.`,
        HTTP_STATUS.BAD_REQUEST,
        'CATEGORY_CONTAINS_PRODUCTS'
      );
    }

    if (childrenCount > 0) {
      throw createServiceError(
        `Cannot delete category "${category.name}" because it contains ${childrenCount} subcategories. Please reassign or delete them first.`,
        HTTP_STATUS.BAD_REQUEST,
        'CATEGORY_CONTAINS_CHILDREN'
      );
    }
  }

  // Perform deletion
  await prisma.category.delete({
    where: { id },
  });

  return {
    id,
    name: category.name,
    deleted: true,
  };
};
