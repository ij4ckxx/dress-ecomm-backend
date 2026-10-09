import prisma from '../../config/db.js';
import { logAdminAction } from '../../utils/auditLogger.js';

const DEFAULT_CONFIG_ID = 'default_store_config';

const DEFAULT_FEATURE_FLAGS = {
  wishlist: true,
  reviews: true,
  coupons: true,
  guestCheckout: true,
  onlinePayment: true,
  cashOnDelivery: true,
  productVariants: true,
  whatsapp: true,
  newsletter: true,
  recommendations: true,
  sizeChart: true,
  orderTracking: true,
};

/**
 * Retrieves the store configuration, initializing default config if not present
 */
export const getStoreSettingsService = async () => {
  let config = await prisma.storeConfig.findUnique({
    where: { id: DEFAULT_CONFIG_ID },
    include: {
      updatedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!config) {
    config = await prisma.storeConfig.create({
      data: {
        id: DEFAULT_CONFIG_ID,
        storeName: 'Maison De Élégance',
        tagline: 'Haute Couture & Bespoke Eveningwear',
        currency: 'INR',
        currencySymbol: '₹',
        supportEmail: 'concierge@maisondeelegance.com',
        supportPhone: '+91 98765 43210',
        activeTheme: 'luxury-fashion',
        freeShippingThreshold: 2999,
        flatShippingRate: 150,
        featuresJson: DEFAULT_FEATURE_FLAGS,
        policiesJson: {
          shippingPolicy: 'Complimentary white-glove express delivery on luxury orders above ₹2,999.',
          returnPolicy: '7-day complimentary bespoke concierge returns for un-altered garments.',
        },
      },
    });
  }

  return config;
};

/**
 * Updates general store settings
 */
export const updateStoreSettingsService = async ({ adminUser, settingsData, req }) => {
  await getStoreSettingsService(); // Ensure default exists

  const updated = await prisma.storeConfig.update({
    where: { id: DEFAULT_CONFIG_ID },
    data: {
      ...settingsData,
      updatedById: adminUser.id,
    },
    include: {
      updatedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Record audit log
  await logAdminAction({
    userId: adminUser.id,
    action: 'UPDATE_STORE_SETTINGS',
    entity: 'STORE_CONFIG',
    entityId: DEFAULT_CONFIG_ID,
    details: settingsData,
    req,
  });

  return updated;
};

/**
 * Switches the active frontend storefront theme
 */
export const updateThemeService = async ({ adminUser, themeId, req }) => {
  await getStoreSettingsService();

  const updated = await prisma.storeConfig.update({
    where: { id: DEFAULT_CONFIG_ID },
    data: {
      activeTheme: themeId,
      updatedById: adminUser.id,
    },
  });

  await logAdminAction({
    userId: adminUser.id,
    action: 'UPDATE_THEME',
    entity: 'STORE_CONFIG',
    entityId: DEFAULT_CONFIG_ID,
    details: { activeTheme: themeId },
    req,
  });

  return updated;
};

/**
 * Updates or toggles storefront feature flags
 */
export const updateFeatureFlagsService = async ({ adminUser, features, req }) => {
  const current = await getStoreSettingsService();

  const currentFeatures =
    typeof current.featuresJson === 'object' && current.featuresJson !== null
      ? current.featuresJson
      : DEFAULT_FEATURE_FLAGS;

  const mergedFeatures = {
    ...currentFeatures,
    ...features,
  };

  const updated = await prisma.storeConfig.update({
    where: { id: DEFAULT_CONFIG_ID },
    data: {
      featuresJson: mergedFeatures,
      updatedById: adminUser.id,
    },
  });

  await logAdminAction({
    userId: adminUser.id,
    action: 'UPDATE_FEATURE_FLAGS',
    entity: 'STORE_CONFIG',
    entityId: DEFAULT_CONFIG_ID,
    details: { updatedFlags: features },
    req,
  });

  return updated;
};
