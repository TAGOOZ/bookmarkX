import type { Client } from '@libsql/client';
import type { ClassificationResult } from '../classify/types';
import { getOrCreateTopic, moveBookmarkToTopic } from './topics';
import { setBookmarkHashtags } from './hashtags';

export async function storeClassification(
  db: Client,
  bookmarkId: string,
  result: ClassificationResult
): Promise<void> {
  const classificationId = crypto.randomUUID();

  try {
    await db.execute({
      sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
      args: [classificationId, bookmarkId, result.priority, result.reading_time_min],
    });

    if (result.topic) {
      const topic = await getOrCreateTopic(db, result.topic, null, 'ai');
      await moveBookmarkToTopic(db, bookmarkId, topic.id);
    }

    if (result.hashtags && result.hashtags.length > 0) {
      await setBookmarkHashtags(db, bookmarkId, result.hashtags);
    }
  } catch (err) {
    await db.execute({
      sql: 'DELETE FROM classifications WHERE id = ?',
      args: [classificationId],
    });
    throw err;
  }
}

export async function getClassification(
  db: Client,
  bookmarkId: string
): Promise<(ClassificationResult & { topic: string; hashtags: string[] }) | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM classifications WHERE bookmark_id = ?',
    args: [bookmarkId],
  });

  const row = rows[0] as any;
  if (!row) return null;

  // Get topic from bookmarks.topic_id
  const { rows: topicRows } = await db.execute({
    sql: `SELECT t.name FROM topics t
       JOIN bookmarks b ON t.id = b.topic_id
       WHERE b.id = ?`,
    args: [bookmarkId],
  });
  const topicName = (topicRows[0] as any)?.name || 'Uncategorized';

  // Get hashtags
  const { rows: hashtagRows } = await db.execute({
    sql: `SELECT h.name FROM hashtags h
       JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
       WHERE bh.bookmark_id = ?
       ORDER BY h.name`,
    args: [bookmarkId],
  });
  const hashtags = hashtagRows.map((h: any) => h.name);

  return {
    priority: row.priority,
    reading_time_min: row.reading_time_min,
    topic: topicName,
    hashtags,
  };
}

export async function getClassifiedBookmarks(
  db: Client
): Promise<Array<{ bookmark_id: string; priority: string; reading_time_min: number; topic: string; hashtags: string[] }>> {
  const { rows } = await db.execute(
    `SELECT c.bookmark_id, c.priority, c.reading_time_min,
            COALESCE(t.name, 'Uncategorized') as topic
     FROM classifications c
     LEFT JOIN bookmarks b ON c.bookmark_id = b.id
     LEFT JOIN topics t ON b.topic_id = t.id
     ORDER BY c.created_at DESC`
  );

  const results = rows as any[];

  // Batch fetch all hashtags in one query
  const bookmarkIds = results.map((r) => r.bookmark_id);
  if (bookmarkIds.length > 0) {
    const placeholders = bookmarkIds.map(() => '?').join(',');
    const { rows: allHashtagRows } = await db.execute({
      sql: `SELECT bh.bookmark_id, h.name FROM hashtags h
            JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
            WHERE bh.bookmark_id IN (${placeholders})
            ORDER BY h.name`,
      args: bookmarkIds,
    });

    const hashtagMap = new Map<string, string[]>();
    for (const row of allHashtagRows as any[]) {
      const existing = hashtagMap.get(row.bookmark_id) || [];
      existing.push(row.name);
      hashtagMap.set(row.bookmark_id, existing);
    }

    for (const row of results) {
      row.hashtags = hashtagMap.get(row.bookmark_id) || [];
    }
  } else {
    for (const row of results) {
      row.hashtags = [];
    }
  }

  return results;
}
