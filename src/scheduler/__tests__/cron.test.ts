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

  it('starts and returns a job with stop and trigger methods', () => {
    mockFetchAndStore.mockResolvedValue({ stored: 0, skipped: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');

    expect(job).toBeDefined();
    expect(typeof job.stop).toBe('function');
    expect(typeof job.trigger).toBe('function');
  });

  it('calls fetchAndStore when triggered', async () => {
    mockFetchAndStore.mockResolvedValue({ stored: 3, skipped: 1 });

    const job = startCronScheduler(db, '0 */6 * * *');
    await job.trigger();

    expect(mockFetchAndStore).toHaveBeenCalledTimes(1);
    expect(mockFetchAndStore).toHaveBeenCalledWith(db);
    job.stop();
  });

  it('calls classifyAndNotify after fetchAndStore', async () => {
    mockFetchAndStore.mockResolvedValue({ stored: 2, skipped: 0 });
    mockClassifyAndNotify.mockResolvedValue({ classified: 2, notified: 1, errors: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');
    await job.trigger();

    expect(mockFetchAndStore).toHaveBeenCalled();
    expect(mockClassifyAndNotify).toHaveBeenCalled();
    expect(mockFetchAndStore.mock.invocationCallOrder[0]).toBeLessThan(
      mockClassifyAndNotify.mock.invocationCallOrder[0]
    );
    job.stop();
  });

  it('skips concurrent triggers while pipeline is running', async () => {
    let resolveFetch: (value: { stored: number; skipped: number }) => void;
    mockFetchAndStore.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );
    mockClassifyAndNotify.mockResolvedValue({ classified: 0, notified: 0, errors: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');

    const firstTrigger = job.trigger();
    const secondTrigger = job.trigger();

    resolveFetch!({ stored: 1, skipped: 0 });
    await firstTrigger;
    await secondTrigger;

    expect(mockFetchAndStore).toHaveBeenCalledTimes(1);
    job.stop();
  });

  it('resets isRunning after pipeline completes so next trigger works', async () => {
    mockFetchAndStore
      .mockResolvedValueOnce({ stored: 1, skipped: 0 })
      .mockResolvedValueOnce({ stored: 2, skipped: 0 });
    mockClassifyAndNotify
      .mockResolvedValueOnce({ classified: 1, notified: 0, errors: 0 })
      .mockResolvedValueOnce({ classified: 2, notified: 0, errors: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');

    await job.trigger();
    await job.trigger();

    expect(mockFetchAndStore).toHaveBeenCalledTimes(2);
    expect(mockClassifyAndNotify).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it('resets isRunning when fetchAndStore throws', async () => {
    mockFetchAndStore
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ stored: 1, skipped: 0 });
    mockClassifyAndNotify.mockResolvedValue({ classified: 0, notified: 0, errors: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');

    await job.trigger();
    expect(mockFetchAndStore).toHaveBeenCalledTimes(1);

    await job.trigger();
    expect(mockFetchAndStore).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it('resets isRunning when classifyAndNotify throws', async () => {
    mockFetchAndStore.mockResolvedValue({ stored: 1, skipped: 0 });
    mockClassifyAndNotify
      .mockRejectedValueOnce(new Error('classify failed'))
      .mockResolvedValueOnce({ classified: 0, notified: 0, errors: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');

    await job.trigger();
    expect(mockClassifyAndNotify).toHaveBeenCalledTimes(1);

    await job.trigger();
    expect(mockClassifyAndNotify).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it('does not call classifyAndNotify when fetchAndStore throws', async () => {
    mockFetchAndStore.mockRejectedValue(new Error('network error'));

    const job = startCronScheduler(db, '0 */6 * * *');
    await job.trigger();

    expect(mockClassifyAndNotify).not.toHaveBeenCalled();
    job.stop();
  });

  it('stops the cron job without error', () => {
    mockFetchAndStore.mockResolvedValue({ stored: 0, skipped: 0 });

    const job = startCronScheduler(db, '0 */6 * * *');
    job.stop();

    expect(() => job.stop()).not.toThrow();
  });
});
