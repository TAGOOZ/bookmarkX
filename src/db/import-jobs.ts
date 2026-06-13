import type { Client } from '@libsql/client';
import type { ImportJobRow } from './row-types';
import { mapRow } from './row-types';

export interface ImportJob {
  id: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  cursor: string | null;
  total_fetched: number;
  total_classified: number;
  started_at: string;
  completed_at: string | null;
}

const IMPORT_JOB_FIELDS: (keyof ImportJobRow)[] = ['id', 'status', 'cursor', 'total_fetched', 'total_classified', 'started_at', 'completed_at'];

export async function createImportJob(db: Client): Promise<ImportJob> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO import_jobs (id, status) VALUES (?, 'running')`,
    args: [id],
  });
  return {
    id,
    status: 'running',
    cursor: null,
    total_fetched: 0,
    total_classified: 0,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
}

export async function getImportJob(
  db: Client,
  jobId: string,
): Promise<ImportJob | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM import_jobs WHERE id = ?',
    args: [jobId],
  });
  const row = rows[0];
  if (!row) return null;
  const r = mapRow<ImportJobRow>(row, IMPORT_JOB_FIELDS);
  return {
    id: r.id,
    status: r.status as ImportJob['status'],
    cursor: r.cursor,
    total_fetched: r.total_fetched,
    total_classified: r.total_classified,
    started_at: r.started_at,
    completed_at: r.completed_at,
  };
}

export async function updateImportJob(
  db: Client,
  jobId: string,
  updates: {
    status?: 'running' | 'paused' | 'completed' | 'failed';
    cursor?: string | null;
    total_fetched?: number;
    total_classified?: number;
  },
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (updates.status !== undefined) {
    sets.push('status = ?');
    args.push(updates.status);
  }
  if (updates.cursor !== undefined) {
    sets.push('cursor = ?');
    args.push(updates.cursor);
  }
  if (updates.total_fetched !== undefined) {
    sets.push('total_fetched = ?');
    args.push(updates.total_fetched);
  }
  if (updates.total_classified !== undefined) {
    sets.push('total_classified = ?');
    args.push(updates.total_classified);
  }

  if (updates.status === 'completed' || updates.status === 'failed') {
    sets.push('completed_at = CURRENT_TIMESTAMP');
  }

  if (sets.length === 0) return;

  args.push(jobId);
  await db.execute({
    sql: `UPDATE import_jobs SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });
}

export async function getActiveImportJob(
  db: Client,
): Promise<ImportJob | null> {
  const { rows } = await db.execute(
    `SELECT * FROM import_jobs
     WHERE status IN ('running', 'paused')
     ORDER BY started_at DESC LIMIT 1`,
  );
  const row = rows[0];
  if (!row) return null;
  const r = mapRow<ImportJobRow>(row, IMPORT_JOB_FIELDS);
  return {
    id: r.id,
    status: r.status as ImportJob['status'],
    cursor: r.cursor,
    total_fetched: r.total_fetched,
    total_classified: r.total_classified,
    started_at: r.started_at,
    completed_at: r.completed_at,
  };
}
