import {
  getOrdersService,
  getOrderByIdService,
  updateOrderStatusService,
  updateOrderShippingService,
  updateOrderNotesService,
  cancelOrderService,
  exportOrdersCsvService,
  updateOrderPaymentStatusService,
  getOrderMetafieldsService,
  upsertOrderMetafieldService,
  deleteOrderMetafieldService,
} from '../../services/admin/order.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

/**
 * Get paginated orders list with filtering and fulfillment summary metrics
 * GET /api/v1/admin/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const result = await getOrdersService({ query: req.query });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Orders fetched successfully',
      data: result.orders,
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
 * Get complete order breakdown with items, addresses, payments, and history
 * GET /api/v1/admin/orders/:id
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await getOrderByIdService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Order details fetched successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Advance order status via state machine
 * PATCH /api/v1/admin/orders/:id/status
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const updated = await updateOrderStatusService({
      orderId: req.params.id,
      adminUser: req.user,
      statusData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Order #${updated.orderNumber} status updated to ${updated.status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign courier tracking details and mark order as dispatched / SHIPPED
 * PATCH /api/v1/admin/orders/:id/shipping
 */
export const updateOrderShipping = async (req, res, next) => {
  try {
    const updated = await updateOrderShippingService({
      orderId: req.params.id,
      adminUser: req.user,
      shippingData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Shipment assigned for #${updated.orderNumber} via ${updated.courierPartner}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update private internal notes for store staff
 * PATCH /api/v1/admin/orders/:id/notes
 */
export const updateOrderNotes = async (req, res, next) => {
  try {
    const updated = await updateOrderNotesService({
      orderId: req.params.id,
      notesData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Internal admin notes updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order with reason and restore inventory units
 * POST /api/v1/admin/orders/:id/cancel
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const cancelled = await cancelOrderService({
      orderId: req.params.id,
      adminUser: req.user,
      cancelData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Order #${cancelled.orderNumber} successfully cancelled`,
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export orders manifest to CSV for courier pickup & warehouse packing slips
 * GET /api/v1/admin/orders/export/csv
 */
export const exportOrdersCsv = async (req, res, next) => {
  try {
    const csv = await exportOrdersCsvService({ query: req.query });

    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="orders-manifest-${timestamp}.csv"`
    );

    return res.status(HTTP_STATUS.OK).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Record payment collection or update payment status for an order
 * PATCH /api/v1/admin/orders/:id/payment
 */
export const updateOrderPaymentStatus = async (req, res, next) => {
  try {
    const updated = await updateOrderPaymentStatusService({
      orderId: req.params.id,
      adminUser: req.user,
      paymentData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Order #${updated.orderNumber} payment status updated to ${updated.paymentStatus}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve all metafields for an order (both public and internal)
 * GET /api/v1/admin/orders/:id/metafields
 */
export const getOrderMetafields = async (req, res, next) => {
  try {
    const metafields = await getOrderMetafieldsService(req.params.id);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Order metafields fetched successfully',
      data: metafields,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update an order metafield
 * POST /api/v1/admin/orders/:id/metafields
 */
export const upsertOrderMetafield = async (req, res, next) => {
  try {
    const metafield = await upsertOrderMetafieldService({
      orderId: req.params.id,
      metafieldData: req.body,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Order metafield '${metafield.namespace}.${metafield.key}' saved successfully`,
      data: metafield,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an order metafield
 * DELETE /api/v1/admin/orders/:id/metafields/:metafieldId
 */
export const deleteOrderMetafield = async (req, res, next) => {
  try {
    const result = await deleteOrderMetafieldService({
      orderId: req.params.id,
      metafieldId: req.params.metafieldId,
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

