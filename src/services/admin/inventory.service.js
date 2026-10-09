import prisma from '../../config/db.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

const createServiceError = (message, statusCode = HTTP_STATUS.BAD_REQUEST, code = 'ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Retrieves flattened inventory rows with stock status and summary counters
 */
export const getInventoryService = async ({ query }) => {
  const {
    page = 1,
    limit = 20,
    search,
    status = 'ALL',
    categoryId,
    sort = 'stock_asc',
  } = query;

  const skip = (page - 1) * limit;

  // Build filter for Variants
  const variantWhere = {};
  if (categoryId) {
    variantWhere.product = { categoryId };
  }

  if (search) {
    variantWhere.OR = [
      { sku: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { brand: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Fetch all matching variants with product details
  const variants = await prisma.productVariant.findMany({
    where: variantWhere,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          categoryId: true,
          category: { select: { id: true, name: true, slug: true } },
          images: {
            where: { isThumbnail: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      attributes: {
        include: {
          attributeValue: {
            include: { attribute: true },
          },
        },
      },
    },
    orderBy: sort === 'stock_desc'
      ? { stockQuantity: 'desc' }
      : sort === 'name_asc'
      ? { name: 'asc' }
      : sort === 'sku_asc'
      ? { sku: 'asc' }
      : { stockQuantity: 'asc' },
  });

  // Map into unified inventory items
  let inventoryItems = variants.map((v) => {
    let size = null;
    let color = null;

    for (const attr of v.attributes) {
      const attrName = attr.attributeValue.attribute.name.toLowerCase();
      if (attrName === 'size') size = attr.attributeValue.value;
      if (attrName === 'color') color = attr.attributeValue.value;
    }

    const threshold = v.lowStockThreshold || 5;
    let itemStatus = 'IN_STOCK';
    if (v.stockQuantity === 0) {
      itemStatus = 'OUT_OF_STOCK';
    } else if (v.stockQuantity <= threshold) {
      itemStatus = 'LOW_STOCK';
    }

    return {
      itemType: 'VARIANT',
      id: v.id,
      variantId: v.id,
      productId: v.product.id,
      productName: v.product.name,
      brand: v.product.brand,
      sku: v.sku,
      variantName: v.name,
      size,
      color,
      stockQuantity: v.stockQuantity,
      lowStockThreshold: threshold,
      status: itemStatus,
      regularPrice: v.regularPrice,
      salePrice: v.salePrice,
      costPrice: v.costPrice,
      isActive: v.isActive,
      category: v.product.category,
      thumbnail: v.product.images[0]?.url || null,
      updatedAt: v.updatedAt,
    };
  });

  // Filter by stock status if requested
  if (status !== 'ALL') {
    inventoryItems = inventoryItems.filter((item) => item.status === status);
  }

  // Compute warehouse summary counters across all records
  const allVariants = await prisma.productVariant.findMany({
    select: { stockQuantity: true, lowStockThreshold: true },
  });

  let totalStockUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const v of allVariants) {
    totalStockUnits += v.stockQuantity;
    const thresh = v.lowStockThreshold || 5;
    if (v.stockQuantity === 0) {
      outOfStockCount++;
    } else if (v.stockQuantity <= thresh) {
      lowStockCount++;
    }
  }

  const total = inventoryItems.length;
  const paginatedItems = inventoryItems.slice(skip, skip + limit);

  return {
    items: paginatedItems,
    summary: {
      totalVariants: allVariants.length,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Adjusts inventory atomically and logs audit transaction
 */
export const adjustStockService = async ({ adminUser, adjustData }) => {
  const { variantId, productId, delta, newStock, type = 'ADJUSTMENT', reason, referenceId } = adjustData;

  const result = await prisma.$transaction(async (tx) => {
    // Case 1: Adjusting a ProductVariant
    if (variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      });

      if (!variant) {
        throw createServiceError('Product variant not found', HTTP_STATUS.NOT_FOUND, 'VARIANT_NOT_FOUND');
      }

      const previousStock = variant.stockQuantity;
      let calculatedStock = previousStock;
      let quantityChange = 0;

      if (newStock !== undefined) {
        calculatedStock = newStock;
        quantityChange = newStock - previousStock;
      } else if (delta !== undefined) {
        calculatedStock = previousStock + delta;
        quantityChange = delta;
      }

      if (calculatedStock < 0) {
        throw createServiceError(
          `Adjustment failed: Resulting stock cannot be negative (current: ${previousStock}, adjustment: ${quantityChange}).`,
          HTTP_STATUS.BAD_REQUEST,
          'INSUFFICIENT_STOCK'
        );
      }

      // Update variant stock
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: calculatedStock },
      });

      // Recalculate parent product total stock
      const allProductVariants = await tx.productVariant.findMany({
        where: { productId: variant.productId },
        select: { stockQuantity: true },
      });
      const newTotalProductStock = allProductVariants.reduce((sum, v) => sum + v.stockQuantity, 0);

      await tx.product.update({
        where: { id: variant.productId },
        data: { stockQuantity: newTotalProductStock },
      });

      // Create double-entry audit transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          variantId,
          productId: variant.productId,
          type,
          quantityChange,
          previousStock,
          newStock: calculatedStock,
          reason,
          referenceId: referenceId || null,
          createdById: adminUser.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return {
        transaction,
        itemType: 'VARIANT',
        variantId,
        productId: variant.productId,
        productName: variant.product.name,
        sku: variant.sku,
        previousStock,
        newStock: calculatedStock,
        quantityChange,
      };
    }

    // Case 2: Adjusting standalone Product directly
    if (productId) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, sku: true, stockQuantity: true },
      });

      if (!product) {
        throw createServiceError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
      }

      const previousStock = product.stockQuantity;
      let calculatedStock = previousStock;
      let quantityChange = 0;

      if (newStock !== undefined) {
        calculatedStock = newStock;
        quantityChange = newStock - previousStock;
      } else if (delta !== undefined) {
        calculatedStock = previousStock + delta;
        quantityChange = delta;
      }

      if (calculatedStock < 0) {
        throw createServiceError(
          `Adjustment failed: Resulting stock cannot be negative (current: ${previousStock}, adjustment: ${quantityChange}).`,
          HTTP_STATUS.BAD_REQUEST,
          'INSUFFICIENT_STOCK'
        );
      }

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: calculatedStock },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          type,
          quantityChange,
          previousStock,
          newStock: calculatedStock,
          reason,
          referenceId: referenceId || null,
          createdById: adminUser.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return {
        transaction,
        itemType: 'PRODUCT',
        productId,
        productName: product.name,
        sku: product.sku,
        previousStock,
        newStock: calculatedStock,
        quantityChange,
      };
    }
  });

  return result;
};

/**
 * Retrieves paginated inventory audit transaction logs
 */
export const getInventoryTransactionsService = async ({ query }) => {
  const { page = 1, limit = 20, variantId, productId, type, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where = {};
  if (variantId) where.variantId = variantId;
  if (productId) where.productId = productId;
  if (type) where.type = type;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        variant: {
          select: { id: true, sku: true, name: true },
        },
        product: {
          select: { id: true, name: true, sku: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves high-priority inventory alerts (garments at or below threshold)
 */
export const getInventoryAlertsService = async () => {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
          images: {
            where: { isThumbnail: true },
            select: { url: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { stockQuantity: 'asc' },
  });

  // Filter items where stockQuantity <= lowStockThreshold
  const alertItems = [];
  for (const v of variants) {
    const threshold = v.lowStockThreshold || 5;
    if (v.stockQuantity <= threshold) {
      alertItems.push({
        id: v.id,
        variantId: v.id,
        productId: v.product.id,
        productName: v.product.name,
        sku: v.sku,
        variantName: v.name,
        stockQuantity: v.stockQuantity,
        lowStockThreshold: threshold,
        status: v.stockQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        categoryName: v.product.category?.name || 'Uncategorized',
        thumbnail: v.product.images[0]?.url || null,
      });
    }
  }

  return {
    count: alertItems.length,
    alerts: alertItems,
  };
};

/**
 * Updates safety threshold for a variant or standalone product
 */
export const updateStockThresholdService = async ({ variantId, productId, lowStockThreshold }) => {
  if (variantId) {
    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { lowStockThreshold },
      select: {
        id: true,
        sku: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
    });
    return { itemType: 'VARIANT', ...updated };
  }

  if (productId) {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { lowStockThreshold },
      select: {
        id: true,
        sku: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
    });
    return { itemType: 'PRODUCT', ...updated };
  }
};
