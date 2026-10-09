import {
  getStoreSettingsService,
  updateStoreSettingsService,
  updateThemeService,
  updateFeatureFlagsService,
} from '../../services/admin/settings.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

export const getStoreSettings = async (req, res, next) => {
  try {
    const config = await getStoreSettingsService();

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Store settings fetched successfully',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStoreSettings = async (req, res, next) => {
  try {
    const updated = await updateStoreSettingsService({
      adminUser: req.user,
      settingsData: req.body,
      req,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Store settings updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTheme = async (req, res, next) => {
  try {
    const updated = await updateThemeService({
      adminUser: req.user,
      themeId: req.body.themeId,
      req,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Active storefront theme switched to '${updated.activeTheme}'`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFeatureFlags = async (req, res, next) => {
  try {
    const updated = await updateFeatureFlagsService({
      adminUser: req.user,
      features: req.body.features,
      req,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Storefront feature flags updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
