import {
  getOverviewAnalyticsService,
  getRevenueChartService,
  getTopProductsService,
  getOrderStatusDistributionService,
  purgeAnalyticsCacheService,
} from '../../services/admin/analytics.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

export const getOverviewAnalytics = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    const { data, fromCache } = await getOverviewAnalyticsService(period);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Dashboard analytics overview fetched successfully',
      data,
      meta: {
        fromCache,
        ttl: 60,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRevenueChart = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    const { data, fromCache } = await getRevenueChartService(period);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Revenue chart time-series fetched successfully',
      data: data.dataPoints,
      meta: {
        period: data.period,
        fromCache,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req, res, next) => {
  try {
    const { period = '30d', limit = 5 } = req.query;
    const { data, fromCache } = await getTopProductsService({
      period,
      limit: Number(limit),
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Top-selling products fetched successfully',
      data,
      meta: {
        fromCache,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderStatusDistribution = async (req, res, next) => {
  try {
    const { data, fromCache } = await getOrderStatusDistributionService();

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Order status distribution fetched successfully',
      data: data.distribution,
      meta: {
        totalOrders: data.totalOrders,
        fromCache,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const purgeAnalyticsCache = async (req, res, next) => {
  try {
    const result = purgeAnalyticsCacheService();

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
