import cron from 'node-cron';
import type { Client } from '@libsql/client';
import { fetchAndStore } from '../pipeline/fetch-and-store';
import { classifyAndNotify } from '../pipeline/classify-and-notify';

let isRunning = false;

export interface CronJob {
  stop: () => void;
  trigger: () => Promise<void>;
}

export function startCronScheduler(
  db: Client,
  schedule = '0 */6 * * *',
): CronJob {
  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await fetchAndStore(db);
      await classifyAndNotify(db);
    } catch (err) {
      console.error(`[cron] Pipeline error at ${new Date().toISOString()}:`, err);
    } finally {
      isRunning = false;
    }
  };

  const task = cron.schedule(schedule, run);

  return {
    stop: () => task.stop(),
    trigger: run,
  };
}
