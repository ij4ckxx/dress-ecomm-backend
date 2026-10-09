import prisma from '../config/db.js';

/**
 * Asynchronously records administrative operations into the immutable AuditLog ledger.
 * Non-blocking: Errors are caught and logged so audit failures never break API responses.
 *
 * @param {object} params
 * @param {string} params.userId - Admin user ID who performed the action
 * @param {string} params.action - Verb action (e.g. 'CREATE_PRODUCT', 'UPDATE_SETTINGS', 'CANCEL_ORDER')
 * @param {string} params.entity - Entity type (e.g. 'PRODUCT', 'ORDER', 'STORE_CONFIG', 'COUPON')
 * @param {string} [params.entityId] - ID of affected entity
 * @param {object} [params.details] - Arbitrary metadata or change diff
 * @param {import('express').Request} [params.req] - Express request object for IP and User-Agent capture
 */
export const logAdminAction = async ({
  userId,
  action,
  entity,
  entityId = null,
  details = null,
  req = null,
}) => {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        null;
      userAgent = req.headers['user-agent'] || null;
    }

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        detailsJson: details || null,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Non-blocking fallback: Never crash main thread on telemetry logging
    console.error('AuditLog Error:', err.message);
  }
};
