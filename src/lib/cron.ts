/**
 * Cron job setup for price monitoring
 * Runs daily at 12:00 AM Indian Standard Time (IST)
 * IST is UTC+5:30, so 12:00 AM IST = 6:30 PM UTC (previous day)
 */

import cron from 'node-cron';

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
      
      const secretKey = process.env.CRON_SECRET_KEY || 'default-secret-key';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/monitor/update-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secretKey}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Cron] Price update completed:', result.message);
      } else {
        const error = await response.json();
        console.error('[Cron] Price update failed:', error);
      }
    } catch (error: any) {
      console.error('[Cron] Error running price update:', error.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // IST timezone
  });

  console.log('[Cron] Price update cron job started successfully');
}

/**
 * Stop the cron job
 */
export function stopPriceUpdateCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[Cron] Price update cron job stopped');
  }
}
