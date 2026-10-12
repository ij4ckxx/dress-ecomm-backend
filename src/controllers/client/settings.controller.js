import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { getStoreSettingsService } from '../../services/admin/settings.service.js';

/**
 * Controller to fetch public store configuration & feature flags for the customer storefront
 * GET /api/v1/settings
 * GET /api/settings
 */
export const getPublicSettings = async (req, res, next) => {
  try {
    const config = await getStoreSettingsService();

    // Return safe public storefront settings
    const publicSettings = {
      storeName: config.storeName,
      tagline: config.tagline,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      supportEmail: config.supportEmail,
      supportPhone: config.supportPhone,
      activeTheme: config.activeTheme,
      freeShippingThreshold: typeof config.freeShippingThreshold?.toNumber === 'function'
        ? config.freeShippingThreshold.toNumber()
        : Number(config.freeShippingThreshold),
      flatShippingRate: typeof config.flatShippingRate?.toNumber === 'function'
        ? config.flatShippingRate.toNumber()
        : Number(config.flatShippingRate),
      features: config.featuresJson,
      policies: config.policiesJson,
    };

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Store settings retrieved successfully',
      data: publicSettings,
    });
  } catch (error) {
    next(error);
  }
};
