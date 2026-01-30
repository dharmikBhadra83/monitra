/**
 * Cron job setup for price monitoring
 * Runs daily at 12:00 AM Indian Standard Time (IST)
 * Internal use only — not exposed via API.
 */

import cron from 'node-cron';
import { runPriceUpdate } from '@/lib/update-prices';

// 12:00 AM IST = 18:30 UTC (previous day)
// Cron expression: minute hour day month weekday
// 30 18 * * * = Every day at 18:30 UTC (which is 12:00 AM IST)
// For IST directly: '0 0 * * *' with timezone 'Asia/Kolkata'
const CRON_SCHEDULE = '0 0 * * *'; // 12:00 AM in the specified timezone

let cronJob: cron.ScheduledTask | null = null;

/**
 * Start the cron job to update prices daily at 12 AM IST
 */
export function startPriceUpdateCron() {
  if (cronJob) {
    console.log('[Cron] Price update cron job is already running');
    return;
  }

  console.log(`[Cron] Starting price update cron job (runs daily at 12:00 AM IST)`);

  cronJob = cron.schedule(CRON_SCHEDULE, async () => {
    try {
      console.log('[Cron] Running scheduled price update...');
      const results = await runPriceUpdate();
      console.log(
        `[Cron] Price update completed: ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Cron] Error running price update:', msg);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata', 
  });

  console.log('[Cron] Price update cron job started successfully');
}
