import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from '../../db/__tests__/test-client';
import { startCronScheduler } from '../cron';

vi.mock('../../pipeline/fetch-and-store', () => ({
  fetchAndStore: vi.fn(),
}));

vi.mock('../../pipeline/classify-and-notify', () => ({
  classifyAndNotify: vi.fn(),
}));

import { fetchAndStore } from '../../pipeline/fetch-and-store';
import { classifyAndNotify } from '../../pipeline/classify-and-notify';

const mockFetchAndStore = vi.mocked(fetchAndStore);
const mockClassifyAndNotify = vi.mocked(classifyAndNotify);

describe('cron scheduler', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    db.close();
  });

  it('starts a cron job that runs fetchAndStore', () => {
    mockFetchAndStore.mockResolvedValue({ stored: 0, skipped: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');

    expect(job).toBeDefined();
    expect(typeof job.stop).toBe('function');
  });

  it('stops the cron job gracefully', () => {
    mockFetchAndStore.mockResolvedValue({ stored: 0, skipped: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');
    job.stop();

    expect(() => job.stop()).not.toThrow();
  });

  it('runs fetch when triggered manually', async () => {
    mockFetchAndStore.mockResolvedValue({ stored: 3, skipped: 1 });

    const job = startCronScheduler(db, '0 */6 * * *');
    await job.trigger();

    expect(mockFetchAndStore).toHaveBeenCalled();
    job.stop();
  });

  it('runs classify after fetch on trigger', async () => {
    mockFetchAndStore.mockResolvedValue({ stored: 2, skipped: 0 });
    mockClassifyAndNotify.mockResolvedValue({ classified: 2, notified: 1, errors: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');
    await job.trigger();

    expect(mockFetchAndStore).toHaveBeenCalled();
    expect(mockClassifyAndNotify).toHaveBeenCalled();
    job.stop();
  });
});
