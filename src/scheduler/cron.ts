import cron from 'node-cron';
import Database from 'better-sqlite3';
import { fetchAndStore } from '../pipeline/fetch-and-store';
import { classifyAndNotify } from '../pipeline/classify-and-notify';

export interface CronJob {
  stop: () => void;
  trigger: () => Promise<void>;
}

export function startCronScheduler(
  db: Database.Database,
  schedule = '0 */6 * * *',
): CronJob {
  const run = async () => {
    try {
      await fetchAndStore(db);
      await classifyAndNotify(db);
    } catch {
      // silently ignore cron errors to keep the job alive
    }
  };

  const task = cron.schedule(schedule, run);

  return {
    stop: () => task.stop(),
    trigger: run,
  };
}
