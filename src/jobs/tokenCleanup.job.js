import cron from 'node-cron';
import prisma from '../config/db.js';
import { ENV } from '../config/env.js';

let cronTask = null;

/**
 * Deletes all expired refresh tokens and expired password reset tokens from the database.
 * @returns {Promise<{ deletedRefreshTokens: number, deletedResetTokens: number }>}
 */
export const cleanupExpiredTokens = async () => {
  const now = new Date();

  try {
    // 1. Purge expired or revoked refresh tokens
    const deletedRefresh = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { not: null } },
        ],
      },
    });

    // 2. Purge expired password reset tokens (tokens are only valid for 1 hour)
    const deletedReset = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    const totalCleaned = deletedRefresh.count + deletedReset.count;
    if (totalCleaned > 0) {
      console.log(
        `[CRON] Cleaned up ${deletedRefresh.count} expired/revoked refresh token(s) and ${deletedReset.count} expired reset token(s).`
      );
    }

    return {
      deletedRefreshTokens: deletedRefresh.count,
      deletedResetTokens: deletedReset.count,
    };
  } catch (error) {
    console.error('[CRON ERROR] Failed to clean up expired tokens:', error.message);
    return {
      deletedRefreshTokens: 0,
      deletedResetTokens: 0,
    };
  }
};

/**
 * Initializes and starts the background cron job for token cleanup.
 * Defaults to running once every hour ('0 * * * *') or uses TOKEN_CLEANUP_CRON from .env.
 */
export const startTokenCleanupCron = () => {
  const cronSchedule = ENV.TOKEN_CLEANUP_CRON || '0 */6 * * *';

  if (!cron.validate(cronSchedule)) {
    console.warn(`[CRON WARNING] Invalid cron schedule '${cronSchedule}'. Falling back to '0 * * * *'.`);
  }

  const validSchedule = cron.validate(cronSchedule) ? cronSchedule : '0 * * * *';

  // Run once immediately on server startup to wipe any tokens that expired while offline
  cleanupExpiredTokens().catch((err) => {
    console.error('[CRON ERROR] Initial startup token cleanup failed:', err.message);
  });

  // Schedule recurring background job
  cronTask = cron.schedule(validSchedule, async () => {
    await cleanupExpiredTokens();
  });

  console.log(`[CRON] Token cleanup cron scheduled successfully with expression: '${validSchedule}'`);
  return cronTask;
};

/**
 * Gracefully stops the cron task during application shutdown
 */
export const stopTokenCleanupCron = () => {
  if (cronTask) {
    cronTask.stop();
    console.log('[CRON] Token cleanup cron stopped.');
  }
};
