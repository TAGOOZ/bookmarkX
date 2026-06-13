import type { Client } from '@libsql/client';
import { fetchBookmarksPaginated } from '../fetch/bird';
import { createBookmarks, getBookmarkById } from '../db/bookmarks';
import { createImportJob, getImportJob, updateImportJob, getActiveImportJob } from '../db/import-jobs';
import { createNotification } from '../db/notifications';
import { classifyBookmark } from '../classify/classifier';
import { createClassification, getClassification } from '../db/classifications';
import { sendHighPriorityNotification } from '../notify/notify';
import type { FetchOptions } from '../fetch/types';
import type { ClassifierOptions } from '../classify/types';

const BATCH_SIZE = 20;
const CLASSIFY_BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export interface ImportProgress {
  jobId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  totalFetched: number;
  totalClassified: number;
  currentBatch: number;
  cursor: string | null;
  error?: string;
}

type ProgressCallback = (progress: ImportProgress) => void;

let activeAbort: (() => void) | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  options: FetchOptions,
  retries = MAX_RETRIES
): Promise<ReturnType<typeof fetchBookmarksPaginated>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetchBookmarksPaginated(options);
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError || new Error('Fetch failed after retries');
}

export async function startBatchImport(
  db: Client,
  options: FetchOptions & ClassifierOptions,
  onProgress?: ProgressCallback
): Promise<string> {
  const existing = await getActiveImportJob(db);
  if (existing && existing.status === 'running') {
    throw new Error('An import is already running');
  }

  const job = await createImportJob(db);
  let aborted = false;

  activeAbort = () => { aborted = true; };

  const report = (progress: ImportProgress) => {
    onProgress?.(progress);
  };

  (async () => {
    let currentCursor = existing?.cursor || undefined;
    let totalFetched = existing?.total_fetched || 0;
    let totalClassified = existing?.total_classified || 0;
    let batchNum = 0;

    try {
      await updateImportJob(db, job.id, { status: 'running' });

      while (!aborted) {
        const result = await fetchWithRetry({
          ...options,
          count: BATCH_SIZE,
          cursor: currentCursor,
        });

        if (result.bookmarks.length === 0 && !result.hasMore) {
          break;
        }

        await createBookmarks(db, result.bookmarks);
        totalFetched += result.bookmarks.length;
        batchNum++;

        await updateImportJob(db, job.id, {
          cursor: result.nextCursor || null,
          total_fetched: totalFetched,
        });

        report({
          jobId: job.id,
          status: 'running',
          totalFetched,
          totalClassified,
          currentBatch: batchNum,
          cursor: result.nextCursor,
        });

        if (!result.hasMore || !result.nextCursor) {
          break;
        }

        currentCursor = result.nextCursor;

        if (aborted) break;
        await delay(500);
      }

      if (!aborted) {
        const { rows } = await db.execute({
          sql: `SELECT b.id FROM bookmarks b
           LEFT JOIN classifications c ON b.id = c.bookmark_id
           WHERE c.id IS NULL
           LIMIT ?`,
          args: [CLASSIFY_BATCH_SIZE],
        });
        const unclassified = rows as any[];

        for (let i = 0; i < unclassified.length; i += CLASSIFY_BATCH_SIZE) {
          if (aborted) break;

          const batch = unclassified.slice(i, i + CLASSIFY_BATCH_SIZE);
          for (const row of batch) {
            if (aborted) break;

            const existing = await getClassification(db, row.id);
            if (existing) continue;

            try {
              const bookmark = await getBookmarkById(db, row.id);
              if (!bookmark) continue;

              const result = await classifyBookmark(bookmark, options);
              await createClassification(db, row.id, result);
              totalClassified++;

              if (result.priority === 'high') {
                sendHighPriorityNotification(bookmark, result);
                await createNotification(db, {
                  type: 'status',
                  title: 'High Priority Bookmark',
                  message: `${bookmark.title || 'Untitled'} — ${result.topic}`,
                  data: { bookmarkId: bookmark.id, priority: result.priority },
                });
              }

              report({
                jobId: job.id,
                status: 'running',
                totalFetched,
                totalClassified,
                currentBatch: batchNum,
                cursor: currentCursor || null,
              });
            } catch (err) {
              console.error(`Failed to classify ${row.id}:`, err);
            }
          }

          if (i + CLASSIFY_BATCH_SIZE < unclassified.length && !aborted) {
            await delay(1000);
          }
        }

        await updateImportJob(db, job.id, {
          status: 'completed',
          total_fetched: totalFetched,
          total_classified: totalClassified,
        });

        await createNotification(db, {
          type: 'status',
          title: 'Import Complete',
          message: `${totalFetched} bookmarks imported, ${totalClassified} classified`,
          data: { jobId: job.id, totalFetched, totalClassified },
        });

        report({
          jobId: job.id,
          status: 'completed',
          totalFetched,
          totalClassified,
          currentBatch: batchNum,
          cursor: null,
        });
      } else {
        await updateImportJob(db, job.id, {
          status: 'paused',
          total_fetched: totalFetched,
          total_classified: totalClassified,
        });

        report({
          jobId: job.id,
          status: 'paused',
          totalFetched,
          totalClassified,
          currentBatch: batchNum,
          cursor: currentCursor || null,
        });
      }
    } catch (err) {
      const error = err as Error;
      await updateImportJob(db, job.id, { status: 'failed' });

      await createNotification(db, {
        type: 'error',
        title: 'Import Failed',
        message: error.message,
        data: { jobId: job.id, error: error.message },
      });

      report({
        jobId: job.id,
        status: 'failed',
        totalFetched,
        totalClassified,
        currentBatch: batchNum,
        cursor: currentCursor || null,
        error: error.message,
      });
    } finally {
      activeAbort = null;
    }
  })();

  return job.id;
}

export function pauseImport(): void {
  activeAbort?.();
}

export async function getImportStatus(
  db: Client,
  jobId: string
): Promise<ImportProgress | null> {
  const job = await getImportJob(db, jobId);
  if (!job) return null;
  return {
    jobId: job.id,
    status: job.status,
    totalFetched: job.total_fetched,
    totalClassified: job.total_classified,
    currentBatch: 0,
    cursor: job.cursor,
  };
}

export async function getActiveImport(
  db: Client
): Promise<ImportProgress | null> {
  const job = await getActiveImportJob(db);
  if (!job) return null;
  return {
    jobId: job.id,
    status: job.status,
    totalFetched: job.total_fetched,
    totalClassified: job.total_classified,
    currentBatch: 0,
    cursor: job.cursor,
  };
}
