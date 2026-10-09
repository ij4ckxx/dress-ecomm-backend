import {
  getInventoryService,
  adjustStockService,
  getInventoryTransactionsService,
  getInventoryAlertsService,
  updateStockThresholdService,
} from '../../services/admin/inventory.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Get flattened inventory monitoring table with stock status & warehouse summary
 * GET /api/v1/admin/inventory
 */
export const getInventory = async (req, res, next) => {
  try {
    const result = await getInventoryService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Inventory records fetched successfully',
      data: result.items,
      pagination: result.pagination,
      meta: {
        summary: result.summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust stock atomically and create audit log in InventoryTransaction ledger
 * POST /api/v1/admin/inventory/adjust
 */
export const adjustStock = async (req, res, next) => {
  try {
    const result = await adjustStockService({
      adminUser: req.user,
      adjustData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Stock successfully adjusted for ${result.sku} (${result.quantityChange >= 0 ? '+' : ''}${result.quantityChange} units)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated inventory transaction audit history
 * GET /api/v1/admin/inventory/transactions
 */
export const getInventoryTransactions = async (req, res, next) => {
  try {
    const result = await getInventoryTransactionsService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Inventory audit transactions fetched successfully',
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get urgent low-stock and out-of-stock garment alerts
 * GET /api/v1/admin/inventory/alerts
 */
export const getInventoryAlerts = async (req, res, next) => {
  try {
    const result = await getInventoryAlertsService();

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `${result.count} inventory alert(s) found`,
      data: result.alerts,
      meta: {
        totalAlerts: result.count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update safety stock threshold for a garment variant or product
 * PATCH /api/v1/admin/inventory/threshold
 */
export const updateStockThreshold = async (req, res, next) => {
  try {
    const result = await updateStockThresholdService(req.body);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Stock threshold updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
