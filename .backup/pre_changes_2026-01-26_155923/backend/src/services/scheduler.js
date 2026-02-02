/**
 * Scheduled Jobs for SimpleFIN Sync
 *
 * Runs daily sync of SimpleFIN transactions to Firefly III
 * Respects SimpleFIN rate limit (24 requests/day)
 */

const cron = require('node-cron');
const syncService = require('./syncService');
const { processPendingNotifications } = require('../utils/notifications');

const SYNC_TIMEZONE = process.env.SYNC_TIMEZONE || 'UTC';

/**
 * Initialize scheduled jobs
 * Called from server.js on startup (production only)
 */
function initScheduler() {
  // Validate timezone
  try {
    new Date().toLocaleString('en-US', { timeZone: SYNC_TIMEZONE });
  } catch (error) {
    console.error(`[Scheduler] Invalid timezone: ${SYNC_TIMEZONE}`);
    console.error('[Scheduler] Falling back to UTC');
    process.env.SYNC_TIMEZONE = 'UTC';
  }

  console.log(`[Scheduler] Initializing with timezone: ${SYNC_TIMEZONE}`);

  // Daily sync at 2:00 AM (configurable timezone)
  cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Starting daily SimpleFIN sync');
    const startTime = Date.now();

    try {
      const result = await syncService.syncAllConnections();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`[Scheduler] Daily sync completed in ${duration}s`);
      console.log(`[Scheduler] Results: ${result.connectionsProcessed} connections, ${result.successCount} succeeded, ${result.failureCount} failed`);
      console.log(`[Scheduler] Imported: ${result.totalImported}, Skipped: ${result.totalSkipped}`);
    } catch (error) {
      console.error('[Scheduler] Daily sync failed:', error);
    }
  }, {
    timezone: SYNC_TIMEZONE
  });

  console.log('[Scheduler] Daily sync scheduled for 2:00 AM');

  // Process notification queue every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const processed = await processPendingNotifications();
      if (processed > 0) {
        console.log(`[Scheduler] Notifications processed: ${processed}`);
      }
    } catch (error) {
      console.error('[Scheduler] Notification processing failed:', error);
    }
  }, {
    timezone: SYNC_TIMEZONE
  });

  console.log('[Scheduler] Notification processing scheduled every 5 minutes');
}

module.exports = { initScheduler };
