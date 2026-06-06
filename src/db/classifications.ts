import type { Client } from '@libsql/client';
import type { ClassificationResult } from '../classify/types';

export async function storeClassification(
  db: Client,
  bookmarkId: string,
  result: ClassificationResult
): Promise<void> {
  const classificationId = crypto.randomUUID();

  await db.execute({
    sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
    args: [classificationId, bookmarkId, result.priority, result.reading_time_min],
  });

  for (const topicName of result.topics) {
    const topicId = crypto.randomUUID();
    await db.execute({
      sql: 'INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)',
      args: [topicId, topicName],
    });

    const { rows } = await db.execute({
      sql: 'SELECT id FROM topics WHERE name = ?',
      args: [topicName],
    });
    const existing = rows[0] as any;
    await db.execute({
      sql: 'INSERT OR IGNORE INTO bookmark_topics (bookmark_id, topic_id) VALUES (?, ?)',
      args: [bookmarkId, existing.id],
    });
  }
}

export async function getClassification(
  db: Client,
  bookmarkId: string
): Promise<(ClassificationResult & { topics: string[] }) | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM classifications WHERE bookmark_id = ?',
    args: [bookmarkId],
  });

  const row = rows[0] as any;
  if (!row) return null;

  const { rows: topicRows } = await db.execute({
    sql: `SELECT t.name FROM topics t
       JOIN bookmark_topics bt ON t.id = bt.topic_id
       WHERE bt.bookmark_id = ?
       ORDER BY t.name`,
    args: [bookmarkId],
  });

  const topics = topicRows.map((t: any) => t.name);

  return {
    priority: row.priority,
    reading_time_min: row.reading_time_min,
    topics,
  };
}

export async function getClassifiedBookmarks(
  db: Client
): Promise<Array<{ bookmark_id: string; priority: string; reading_time_min: number }>> {
  const { rows } = await db.execute(
    `SELECT c.bookmark_id, c.priority, c.reading_time_min
     FROM classifications c
     ORDER BY c.created_at DESC`
  );

  return rows as unknown as Array<{ bookmark_id: string; priority: string; reading_time_min: number }>;
}
