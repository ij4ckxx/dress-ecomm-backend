import crypto from 'crypto';
import prisma from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import {
  CART_STATUS,
  AVAILABILITY_STATUS,
  METAFIELD_VALUE_TYPE,
  CART_LIMITS,
} from '../../constants/cart.constants.js';
import { formatPrice } from '../../utils/pricing.js';

/**
 * Safely converts Decimal or number to standard 2-decimal rounded float
 * @param {any} val
 * @returns {number}
 */
const roundMoney = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'object' && typeof val.toNumber === 'function' ? val.toNumber() : Number(val);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
};

/**
 * Generates a deterministic SHA-256 configuration hash for a cart item
 * Uniquely identifies product + variant + sorted modifier options
 * @param {object} params
 * @param {string} params.productId
 * @param {string|null} [params.variantId=null]
 * @param {string[]} [params.modifierOptionIds=[]]
 * @returns {string}
 */
export const generateConfigHash = ({ productId, variantId = null, modifierOptionIds = [] }) => {
  const sortedModifiers = [...(modifierOptionIds || [])].sort();
  const payload = JSON.stringify({
    productId,
    variantId: variantId || null,
    modifiers: sortedModifiers,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Resolves or creates an active Cart based on customer or guest identity
 * Enforces ownership rules:
 * - Customer cannot access another customer's cart
 * - Guest cannot access another guest's cart or customer cart
 * @param {object} options
 * @param {string|null} [options.userId=null]
 * @param {string|null} [options.guestToken=null]
 * @param {string|null} [options.cartId=null]
 * @param {boolean} [options.autoCreate=false]
 * @returns {Promise<{ cart: object|null, isNew: boolean, guestToken: string|null }>}
 */
export const resolveCart = async ({ userId = null, guestToken = null, cartId = null, autoCreate = false }) => {
  // Case 1: Authenticated Customer
  if (userId) {
    if (cartId) {
      const cart = await prisma.cart.findFirst({
        where: {
          id: cartId,
          status: CART_STATUS.ACTIVE,
        },
      });

      if (!cart) {
        throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
      }

      if (cart.customerId && cart.customerId !== userId) {
        throw new AppError('Access to this cart is forbidden', HTTP_STATUS.FORBIDDEN, 'CART_ACCESS_DENIED');
      }

      return { cart, isNew: false, guestToken: null };
    }

    // Find customer's active cart
    let customerCart = await prisma.cart.findFirst({
      where: {
        customerId: userId,
        status: CART_STATUS.ACTIVE,
      },
    });

    if (!customerCart && autoCreate) {
      customerCart = await prisma.cart.create({
        data: {
          customerId: userId,
          status: CART_STATUS.ACTIVE,
        },
      });
      return { cart: customerCart, isNew: true, guestToken: null };
    }

    return { cart: customerCart, isNew: false, guestToken: null };
  }

  // Case 2: Guest User
  const token = guestToken || (cartId && !userId ? cartId : null);

  if (token) {
    const guestCart = await prisma.cart.findFirst({
      where: {
        OR: [{ guestToken: token }, { id: token }],
        customerId: null,
        status: CART_STATUS.ACTIVE,
      },
    });

    if (guestCart) {
      return { cart: guestCart, isNew: false, guestToken: guestCart.guestToken };
    }

    if (cartId && !guestCart) {
      throw new AppError('Cart not found or invalid token', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
    }
  }

  if (autoCreate) {
    const newGuestToken = crypto.randomUUID();
    const newCart = await prisma.cart.create({
      data: {
        guestToken: newGuestToken,
        status: CART_STATUS.ACTIVE,
      },
    });
    return { cart: newCart, isNew: true, guestToken: newGuestToken };
  }

  return { cart: null, isNew: false, guestToken: null };
};

/**
 * Authoritatively validates product, variant, modifiers, and stock availability
 * Calculates pricing snapshots
 * @param {object} params
 * @param {string} params.productId
 * @param {string|null} [params.variantId=null]
 * @param {string[]} [params.modifierOptionIds=[]]
 * @param {number} params.quantity
 * @returns {Promise<object>}
 */
export const validateProductConfiguration = async ({
  productId,
  variantId = null,
  modifierOptionIds = [],
  quantity = 1,
}) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          name: true,
          regularPrice: true,
          salePrice: true,
          offerPrice: true,
          stockQuantity: true,
          isActive: true,
        },
      },
      modifierGroups: {
        include: {
          options: {
            select: {
              id: true,
              name: true,
              priceDelta: true,
            },
          },
        },
      },
    },
  });

  if (!product || !product.isActive) {
    throw new AppError('Product not found or currently unavailable', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  const hasVariants = product.variants.length > 0;
  let selectedVariant = null;

  if (hasVariants) {
    if (!variantId) {
      throw new AppError('Product requires variant selection', HTTP_STATUS.BAD_REQUEST, 'VARIANT_REQUIRED');
    }
    selectedVariant = product.variants.find((v) => v.id === variantId);
    if (!selectedVariant || !selectedVariant.isActive) {
      throw new AppError('Selected variant not found or inactive', HTTP_STATUS.BAD_REQUEST, 'INVALID_VARIANT');
    }
  } else if (variantId) {
    throw new AppError('This product does not have variants', HTTP_STATUS.BAD_REQUEST, 'INVALID_VARIANT');
  }

  // Stock availability check
  const availableStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;

  if (availableStock <= 0) {
    throw new AppError('Product is currently out of stock', HTTP_STATUS.BAD_REQUEST, 'OUT_OF_STOCK');
  }

  if (quantity > availableStock) {
    throw new AppError(
      `Insufficient stock. Requested ${quantity}, but only ${availableStock} available`,
      HTTP_STATUS.BAD_REQUEST,
      'INSUFFICIENT_STOCK'
    );
  }

  // Modifier validation & pricing
  const validatedModifiers = [];
  let modifierTotal = 0;

  if (modifierOptionIds && modifierOptionIds.length > 0) {
    const allProductOptions = new Map();
    const groupOptionCount = new Map();

    for (const group of product.modifierGroups) {
      for (const opt of group.options) {
        allProductOptions.set(opt.id, { ...opt, groupId: group.id, groupName: group.name });
      }
    }

    for (const optId of modifierOptionIds) {
      const option = allProductOptions.get(optId);
      if (!option) {
        throw new AppError(
          `Modifier option ${optId} does not belong to this product`,
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_MODIFIER'
        );
      }

      const count = (groupOptionCount.get(option.groupId) || 0) + 1;
      groupOptionCount.set(option.groupId, count);

      const delta = roundMoney(option.priceDelta);
      modifierTotal += delta;
      validatedModifiers.push({
        modifierOptionId: option.id,
        priceDelta: delta,
        name: option.name,
        groupName: option.groupName,
      });
    }

    // Verify group maxSelection constraints
    for (const group of product.modifierGroups) {
      const count = groupOptionCount.get(group.id) || 0;
      if (count > group.maxSelection) {
        throw new AppError(
          `Too many options selected for modifier group "${group.name}". Max allowed: ${group.maxSelection}`,
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_MODIFIER_SELECTION'
        );
      }
    }
  }

  // Authoritative base pricing
  const regular = selectedVariant ? (selectedVariant.regularPrice ?? product.regularPrice) : product.regularPrice;
  const sale = selectedVariant ? (selectedVariant.salePrice ?? product.salePrice) : product.salePrice;
  const offer = selectedVariant ? (selectedVariant.offerPrice ?? product.offerPrice) : product.offerPrice;

  const formattedPrice = formatPrice(regular, sale, offer);
  const unitPrice = roundMoney(formattedPrice.effective);
  modifierTotal = roundMoney(modifierTotal);
  const unitWithModifiers = roundMoney(unitPrice + modifierTotal);
  const lineTotal = roundMoney(unitWithModifiers * quantity);

  return {
    product,
    selectedVariant,
    availableStock,
    unitPrice,
    regularPrice: roundMoney(formattedPrice.regular),
    salePrice: formattedPrice.sale !== null ? roundMoney(formattedPrice.sale) : null,
    offerPrice: formattedPrice.offer !== null ? roundMoney(formattedPrice.offer) : null,
    modifierTotal,
    lineTotal,
    validatedModifiers,
  };
};

/**
 * Loads full cart with all relations, calculates totals, and formats frontend response
 * Optimized query avoids N+1 queries
 * @param {string} cartId
 * @returns {Promise<object>}
 */
export const getFormattedCartById = async (cartId) => {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
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
              images: {
                where: { isThumbnail: true },
                take: 1,
                select: { url: true, altText: true },
              },
            },
          },
          variant: {
            select: {
              id: true,
              sku: true,
              name: true,
              regularPrice: true,
              salePrice: true,
              offerPrice: true,
              stockQuantity: true,
              isActive: true,
              images: {
                take: 1,
                select: { url: true, altText: true },
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
          modifiers: {
            include: {
              modifierOption: {
                select: {
                  id: true,
                  name: true,
                  priceDelta: true,
                  modifierGroup: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          metafields: {
            select: {
              id: true,
              namespace: true,
              key: true,
              value: true,
              valueType: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      metafields: {
        select: {
          id: true,
          namespace: true,
          key: true,
          value: true,
          valueType: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  let subtotal = 0;
  let modifiersTotal = 0;
  let itemCount = 0;

  const formattedItems = cart.items.map((item) => {
    const isProductActive = item.product?.isActive ?? false;
    const isVariantActive = item.variant ? item.variant.isActive : true;
    const availableStock = item.variant ? item.variant.stockQuantity : (item.product?.stockQuantity ?? 0);

    // Determine availability state without silently deleting out-of-stock items
    let availabilityStatus = AVAILABILITY_STATUS.AVAILABLE;
    if (!isProductActive || !isVariantActive || availableStock <= 0) {
      availabilityStatus = AVAILABILITY_STATUS.OUT_OF_STOCK;
    } else if (availableStock < item.quantity) {
      availabilityStatus = AVAILABILITY_STATUS.INSUFFICIENT_STOCK;
    }

    const unitPrice = roundMoney(item.unitPrice);
    const modTotal = roundMoney(item.modifierTotal);
    const lineTotal = roundMoney((unitPrice + modTotal) * item.quantity);

    subtotal = roundMoney(subtotal + unitPrice * item.quantity);
    modifiersTotal = roundMoney(modifiersTotal + modTotal * item.quantity);
    itemCount += item.quantity;

    // Extract product thumbnail
    const thumbnail =
      item.variant?.images?.[0]?.url || item.product?.images?.[0]?.url || null;

    // Format variant attributes
    const variantAttributes = item.variant?.attributes?.map((attr) => ({
      attribute: attr.attributeValue.attribute.name,
      attributeSlug: attr.attributeValue.attribute.slug,
      value: attr.attributeValue.value,
      valueSlug: attr.attributeValue.slug,
    })) || [];

    // Format selected modifiers
    const selectedModifiers = item.modifiers.map((m) => ({
      id: m.modifierOption.id,
      name: m.modifierOption.name,
      groupName: m.modifierOption.modifierGroup?.name || '',
      priceDelta: roundMoney(m.priceDelta),
    }));

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        brand: item.product.brand,
        sku: item.product.sku,
        thumbnail,
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            sku: item.variant.sku,
            name: item.variant.name,
            attributes: variantAttributes,
          }
        : null,
      selectedModifiers,
      pricing: {
        unitPrice,
        regularPrice: roundMoney(item.regularPrice),
        salePrice: item.salePrice !== null ? roundMoney(item.salePrice) : null,
        offerPrice: item.offerPrice !== null ? roundMoney(item.offerPrice) : null,
        modifierTotal: modTotal,
        lineTotal,
      },
      availability: {
        status: availabilityStatus,
        availableQuantity: Math.max(0, availableStock),
      },
      metafields: item.metafields,
    };
  });

  const total = roundMoney(subtotal + modifiersTotal);

  return {
    id: cart.id,
    guestToken: cart.guestToken,
    customerId: cart.customerId,
    status: cart.status,
    currency: cart.currency,
    itemCount,
    lineItemCount: formattedItems.length,
    subtotal,
    modifiersTotal,
    discounts: [],
    shipping: null,
    tax: null,
    total,
    items: formattedItems,
    metafields: cart.metafields,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

/**
 * Gets or creates the current cart for customer or guest
 * @param {object} context
 * @returns {Promise<object>}
 */
export const getOrCreateCart = async ({ userId = null, guestToken = null, cartId = null }) => {
  const { cart, guestToken: resolvedToken } = await resolveCart({
    userId,
    guestToken,
    cartId,
    autoCreate: true,
  });

  const formatted = await getFormattedCartById(cart.id);
  return { ...formatted, guestToken: resolvedToken || formatted.guestToken };
};

/**
 * Gets existing cart details without auto-creating
 * @param {object} context
 * @returns {Promise<object>}
 */
export const getCartDetails = async ({ userId = null, guestToken = null, cartId = null }) => {
  const { cart } = await resolveCart({
    userId,
    guestToken,
    cartId,
    autoCreate: false,
  });

  if (!cart) {
    return {
      id: null,
      guestToken: null,
      customerId: userId,
      status: CART_STATUS.ACTIVE,
      currency: 'INR',
      itemCount: 0,
      lineItemCount: 0,
      subtotal: 0,
      modifiersTotal: 0,
      discounts: [],
      shipping: null,
      tax: null,
      total: 0,
      items: [],
      metafields: [],
    };
  }

  return getFormattedCartById(cart.id);
};

/**
 * Adds an item with product + variant + modifiers to cart
 * Safe against concurrent requests & merges duplicate configurations
 * @param {object} context
 * @param {object} input
 * @returns {Promise<object>}
 */
export const addItemToCart = async (context, input) => {
  const { productId, variantId = null, quantity = 1, modifierOptionIds = [], metafields = [] } = input;

  const { cart, guestToken } = await resolveCart({
    userId: context.userId,
    guestToken: context.guestToken,
    cartId: context.cartId,
    autoCreate: true,
  });

  // Check cart item count limit
  const currentItemCount = await prisma.cartItem.count({ where: { cartId: cart.id } });
  if (currentItemCount >= CART_LIMITS.MAX_ITEMS_PER_CART) {
    throw new AppError(
      `Cart cannot contain more than ${CART_LIMITS.MAX_ITEMS_PER_CART} unique items`,
      HTTP_STATUS.BAD_REQUEST,
      'CART_LIMIT_EXCEEDED'
    );
  }

  // Validate product configuration and obtain authoritative pricing
  const config = await validateProductConfiguration({
    productId,
    variantId,
    modifierOptionIds,
    quantity,
  });

  const configHash = generateConfigHash({
    productId,
    variantId,
    modifierOptionIds,
  });

  // Transaction for atomic addition and concurrency safety
  await prisma.$transaction(async (tx) => {
    const existingItem = await tx.cartItem.findUnique({
      where: {
        cartId_configHash: {
          cartId: cart.id,
          configHash,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > config.availableStock) {
        throw new AppError(
          `Cannot add ${quantity} more. Stock limit of ${config.availableStock} reached. (Already in cart: ${existingItem.quantity})`,
          HTTP_STATUS.BAD_REQUEST,
          'INSUFFICIENT_STOCK'
        );
      }

      const unitWithMod = roundMoney(
        roundMoney(existingItem.unitPrice) + roundMoney(existingItem.modifierTotal)
      );
      const newLineTotal = roundMoney(unitWithMod * newQuantity);

      await tx.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          lineTotal: newLineTotal,
        },
      });
    } else {
      const createdItem = await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
          unitPrice: config.unitPrice,
          regularPrice: config.regularPrice,
          salePrice: config.salePrice,
          offerPrice: config.offerPrice,
          modifierTotal: config.modifierTotal,
          lineTotal: config.lineTotal,
          configHash,
        },
      });

      // Insert modifiers if any
      if (config.validatedModifiers.length > 0) {
        await tx.cartItemModifier.createMany({
          data: config.validatedModifiers.map((mod) => ({
            cartItemId: createdItem.id,
            modifierOptionId: mod.modifierOptionId,
            priceDelta: mod.priceDelta,
          })),
        });
      }

      // Insert item metafields if provided
      if (metafields && metafields.length > 0) {
        await tx.cartItemMetafield.createMany({
          data: metafields.map((mf) => ({
            cartItemId: createdItem.id,
            namespace: mf.namespace,
            key: mf.key,
            value: mf.value,
            valueType: mf.valueType || METAFIELD_VALUE_TYPE.STRING,
          })),
        });
      }
    }
  });

  const formatted = await getFormattedCartById(cart.id);
  return { ...formatted, guestToken: guestToken || formatted.guestToken };
};

/**
 * Updates cart item quantity or modifier configuration
 * @param {object} context
 * @param {string} itemId
 * @param {object} input
 * @returns {Promise<object>}
 */
export const updateCartItem = async (context, itemId, input) => {
  const { cart } = await resolveCart({
    userId: context.userId,
    guestToken: context.guestToken,
    cartId: context.cartId,
    autoCreate: false,
  });

  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: {
      modifiers: true,
    },
  });

  if (!item) {
    throw new AppError('Cart item not found', HTTP_STATUS.NOT_FOUND, 'CART_ITEM_NOT_FOUND');
  }

  const targetQuantity = input.quantity !== undefined ? input.quantity : item.quantity;
  const targetModifierIds =
    input.modifierOptionIds !== undefined
      ? input.modifierOptionIds
      : item.modifiers.map((m) => m.modifierOptionId);

  // Validate configuration & check stock
  const config = await validateProductConfiguration({
    productId: item.productId,
    variantId: item.variantId,
    modifierOptionIds: targetModifierIds,
    quantity: targetQuantity,
  });

  const newConfigHash = generateConfigHash({
    productId: item.productId,
    variantId: item.variantId,
    modifierOptionIds: targetModifierIds,
  });

  await prisma.$transaction(async (tx) => {
    // If configuration changed and matches another item in this cart, merge them
    if (newConfigHash !== item.configHash) {
      const existingOtherItem = await tx.cartItem.findUnique({
        where: {
          cartId_configHash: {
            cartId: cart.id,
            configHash: newConfigHash,
          },
        },
      });

      if (existingOtherItem && existingOtherItem.id !== item.id) {
        const mergedQuantity = existingOtherItem.quantity + targetQuantity;
        if (mergedQuantity > config.availableStock) {
          throw new AppError(
            `Cannot merge items. Combined quantity ${mergedQuantity} exceeds available stock of ${config.availableStock}`,
            HTTP_STATUS.BAD_REQUEST,
            'INSUFFICIENT_STOCK'
          );
        }

        const unitWithMod = roundMoney(config.unitPrice + config.modifierTotal);
        const mergedLineTotal = roundMoney(unitWithMod * mergedQuantity);

        // Update the existing target and delete current
        await tx.cartItem.update({
          where: { id: existingOtherItem.id },
          data: {
            quantity: mergedQuantity,
            lineTotal: mergedLineTotal,
          },
        });

        await tx.cartItem.delete({
          where: { id: item.id },
        });

        return;
      }

      // Configuration changed to a new unique config: update modifiers
      await tx.cartItemModifier.deleteMany({
        where: { cartItemId: item.id },
      });

      if (config.validatedModifiers.length > 0) {
        await tx.cartItemModifier.createMany({
          data: config.validatedModifiers.map((mod) => ({
            cartItemId: item.id,
            modifierOptionId: mod.modifierOptionId,
            priceDelta: mod.priceDelta,
          })),
        });
      }
    }

    const unitWithMod = roundMoney(config.unitPrice + config.modifierTotal);
    const newLineTotal = roundMoney(unitWithMod * targetQuantity);

    await tx.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: targetQuantity,
        unitPrice: config.unitPrice,
        regularPrice: config.regularPrice,
        salePrice: config.salePrice,
        offerPrice: config.offerPrice,
        modifierTotal: config.modifierTotal,
        lineTotal: newLineTotal,
        configHash: newConfigHash,
      },
    });
  });

  return getFormattedCartById(cart.id);
};

/**
 * Removes a single item from the cart
 * @param {object} context
 * @param {string} itemId
 * @returns {Promise<object>}
 */
export const removeCartItem = async (context, itemId) => {
  const { cart } = await resolveCart({
    userId: context.userId,
    guestToken: context.guestToken,
    cartId: context.cartId,
    autoCreate: false,
  });

  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    throw new AppError('Cart item not found', HTTP_STATUS.NOT_FOUND, 'CART_ITEM_NOT_FOUND');
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  return getFormattedCartById(cart.id);
};

/**
 * Clears all items from the cart without deleting the cart itself
 * @param {object} context
 * @returns {Promise<object>}
 */
export const clearCart = async (context) => {
  const { cart } = await resolveCart({
    userId: context.userId,
    guestToken: context.guestToken,
    cartId: context.cartId,
    autoCreate: false,
  });

  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return getFormattedCartById(cart.id);
};

/**
 * Merges a guest cart into the customer's authenticated active cart
 * Combines identical configurations, preserves differences, validates stock,
 * copies metafields, and marks the guest cart as CONVERTED
 * @param {string} userId
 * @param {string} guestToken
 * @returns {Promise<object>}
 */
export const mergeGuestCart = async (userId, guestToken) => {
  if (!userId) {
    throw new AppError('Authentication required for cart merge', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
  }

  if (!guestToken) {
    throw new AppError('Guest token is required for cart merge', HTTP_STATUS.BAD_REQUEST, 'GUEST_TOKEN_REQUIRED');
  }

  // Find guest cart
  const guestCart = await prisma.cart.findFirst({
    where: {
      OR: [{ guestToken }, { id: guestToken }],
      customerId: null,
      status: CART_STATUS.ACTIVE,
    },
    include: {
      items: {
        include: {
          modifiers: true,
          metafields: true,
        },
      },
      metafields: true,
    },
  });

  // Resolve or create customer's active cart
  let customerCart = await prisma.cart.findFirst({
    where: {
      customerId: userId,
      status: CART_STATUS.ACTIVE,
    },
  });

  if (!customerCart) {
    customerCart = await prisma.cart.create({
      data: {
        customerId: userId,
        status: CART_STATUS.ACTIVE,
      },
    });
  }

  if (!guestCart || guestCart.items.length === 0) {
    return getFormattedCartById(customerCart.id);
  }

  await prisma.$transaction(async (tx) => {
    // Merge guest items into customer cart
    for (const gItem of guestCart.items) {
      const modifierOptionIds = gItem.modifiers.map((m) => m.modifierOptionId);

      // Verify product and availability authoritatively
      let config;
      try {
        config = await validateProductConfiguration({
          productId: gItem.productId,
          variantId: gItem.variantId,
          modifierOptionIds,
          quantity: gItem.quantity,
        });
      } catch (err) {
        // If product is now out of stock or deleted, skip or carry forward available quantity
        if (err.code === 'OUT_OF_STOCK' || err.code === 'PRODUCT_NOT_FOUND') {
          continue;
        }
        throw err;
      }

      const existingCustItem = await tx.cartItem.findUnique({
        where: {
          cartId_configHash: {
            cartId: customerCart.id,
            configHash: gItem.configHash,
          },
        },
      });

      if (existingCustItem) {
        const mergedQty = Math.min(
          existingCustItem.quantity + gItem.quantity,
          config.availableStock
        );
        const unitWithMod = roundMoney(config.unitPrice + config.modifierTotal);
        const newLineTotal = roundMoney(unitWithMod * mergedQty);

        await tx.cartItem.update({
          where: { id: existingCustItem.id },
          data: {
            quantity: mergedQty,
            unitPrice: config.unitPrice,
            regularPrice: config.regularPrice,
            salePrice: config.salePrice,
            offerPrice: config.offerPrice,
            modifierTotal: config.modifierTotal,
            lineTotal: newLineTotal,
          },
        });
      } else {
        const allowedQty = Math.min(gItem.quantity, config.availableStock);
        if (allowedQty <= 0) continue;

        const unitWithMod = roundMoney(config.unitPrice + config.modifierTotal);
        const newLineTotal = roundMoney(unitWithMod * allowedQty);

        const newCustItem = await tx.cartItem.create({
          data: {
            cartId: customerCart.id,
            productId: gItem.productId,
            variantId: gItem.variantId,
            quantity: allowedQty,
            unitPrice: config.unitPrice,
            regularPrice: config.regularPrice,
            salePrice: config.salePrice,
            offerPrice: config.offerPrice,
            modifierTotal: config.modifierTotal,
            lineTotal: newLineTotal,
            configHash: gItem.configHash,
          },
        });

        // Copy modifiers
        if (config.validatedModifiers.length > 0) {
          await tx.cartItemModifier.createMany({
            data: config.validatedModifiers.map((mod) => ({
              cartItemId: newCustItem.id,
              modifierOptionId: mod.modifierOptionId,
              priceDelta: mod.priceDelta,
            })),
          });
        }

        // Copy item metafields
        if (gItem.metafields.length > 0) {
          await tx.cartItemMetafield.createMany({
            data: gItem.metafields.map((mf) => ({
              cartItemId: newCustItem.id,
              namespace: mf.namespace,
              key: mf.key,
              value: mf.value,
              valueType: mf.valueType,
            })),
          });
        }
      }
    }

    // Merge cart-level metafields (if customer cart doesn't have the same namespace+key)
    for (const gMeta of guestCart.metafields) {
      const existing = await tx.cartMetafield.findUnique({
        where: {
          cartId_namespace_key: {
            cartId: customerCart.id,
            namespace: gMeta.namespace,
            key: gMeta.key,
          },
        },
      });

      if (!existing) {
        await tx.cartMetafield.create({
          data: {
            cartId: customerCart.id,
            namespace: gMeta.namespace,
            key: gMeta.key,
            value: gMeta.value,
            valueType: gMeta.valueType,
          },
        });
      }
    }

    // Deactivate guest cart so it is no longer an active independent cart
    await tx.cart.update({
      where: { id: guestCart.id },
      data: { status: CART_STATUS.CONVERTED },
    });
  });

  return getFormattedCartById(customerCart.id);
};

// ----------------------------------------------------
// CART METAFIELDS CRUD
// ----------------------------------------------------

export const getCartMetafields = async (context) => {
  const { cart } = await resolveCart({ ...context, autoCreate: false });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  return prisma.cartMetafield.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
  });
};

export const upsertCartMetafield = async (context, { namespace, key, value, valueType = 'STRING' }) => {
  const { cart } = await resolveCart({ ...context, autoCreate: true });

  const metafield = await prisma.cartMetafield.upsert({
    where: {
      cartId_namespace_key: {
        cartId: cart.id,
        namespace,
        key,
      },
    },
    create: {
      cartId: cart.id,
      namespace,
      key,
      value,
      valueType,
    },
    update: {
      value,
      valueType,
    },
  });

  return metafield;
};

export const updateCartMetafield = async (context, metafieldId, { value, valueType }) => {
  const { cart } = await resolveCart({ ...context, autoCreate: false });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const existing = await prisma.cartMetafield.findFirst({
    where: { id: metafieldId, cartId: cart.id },
  });

  if (!existing) {
    throw new AppError('Cart metafield not found', HTTP_STATUS.NOT_FOUND, 'METAFIELD_NOT_FOUND');
  }

  return prisma.cartMetafield.update({
    where: { id: metafieldId },
    data: {
      value: value !== undefined ? value : existing.value,
      valueType: valueType || existing.valueType,
    },
  });
};

export const deleteCartMetafield = async (context, metafieldId) => {
  const { cart } = await resolveCart({ ...context, autoCreate: false });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const existing = await prisma.cartMetafield.findFirst({
    where: { id: metafieldId, cartId: cart.id },
  });

  if (!existing) {
    throw new AppError('Cart metafield not found', HTTP_STATUS.NOT_FOUND, 'METAFIELD_NOT_FOUND');
  }

  await prisma.cartMetafield.delete({
    where: { id: metafieldId },
  });

  return { success: true, message: 'Cart metafield deleted successfully' };
};

// ----------------------------------------------------
// CART ITEM METAFIELDS CRUD
// ----------------------------------------------------

export const getCartItemMetafields = async (context, itemId) => {
  const { cart } = await resolveCart({ ...context, autoCreate: false });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    throw new AppError('Cart item not found', HTTP_STATUS.NOT_FOUND, 'CART_ITEM_NOT_FOUND');
  }

  return prisma.cartItemMetafield.findMany({
    where: { cartItemId: itemId },
    orderBy: { createdAt: 'asc' },
  });
};

export const upsertCartItemMetafield = async (context, itemId, { namespace, key, value, valueType = 'STRING' }) => {
  const { cart } = await resolveCart({ ...context, autoCreate: false });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    throw new AppError('Cart item not found', HTTP_STATUS.NOT_FOUND, 'CART_ITEM_NOT_FOUND');
  }

  return prisma.cartItemMetafield.upsert({
    where: {
      cartItemId_namespace_key: {
        cartItemId: itemId,
        namespace,
        key,
      },
    },
    create: {
      cartItemId: itemId,
      namespace,
      key,
      value,
      valueType,
    },
    update: {
      value,
      valueType,
    },
  });
};

export const updateCartItemMetafield = async (context, itemId, metafieldId, { value, valueType }) => {
  const { cart } = await resolveCart({ ...context, autoCreate: false });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    throw new AppError('Cart item not found', HTTP_STATUS.NOT_FOUND, 'CART_ITEM_NOT_FOUND');
  }

  const existing = await prisma.cartItemMetafield.findFirst({
    where: { id: metafieldId, cartItemId: itemId },
  });

  if (!existing) {
    throw new AppError('Cart item metafield not found', HTTP_STATUS.NOT_FOUND, 'METAFIELD_NOT_FOUND');
  }

  return prisma.cartItemMetafield.update({
    where: { id: metafieldId },
    data: {
      value: value !== undefined ? value : existing.value,
      valueType: valueType || existing.valueType,
    },
  });
};

export const deleteCartItemMetafield = async (context, itemId, metafieldId) => {
  const { cart } = await resolveCart({ ...context, autoCreate: false });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    throw new AppError('Cart item not found', HTTP_STATUS.NOT_FOUND, 'CART_ITEM_NOT_FOUND');
  }

  const existing = await prisma.cartItemMetafield.findFirst({
    where: { id: metafieldId, cartItemId: itemId },
  });

  if (!existing) {
    throw new AppError('Cart item metafield not found', HTTP_STATUS.NOT_FOUND, 'METAFIELD_NOT_FOUND');
  }

  await prisma.cartItemMetafield.delete({
    where: { id: metafieldId },
  });

  return { success: true, message: 'Cart item metafield deleted successfully' };
};
