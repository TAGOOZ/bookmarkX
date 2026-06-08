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

  await db.execute({
    sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
    args: [classificationId, bookmarkId, result.priority, result.reading_time_min],
  });

  // Store single topic (ADR-0019: bookmark belongs to exactly one topic)
  if (result.topic) {
    const topic = await getOrCreateTopic(db, result.topic, null, 'ai');
    await moveBookmarkToTopic(db, bookmarkId, topic.id);
  }

  // Store hashtags
  if (result.hashtags && result.hashtags.length > 0) {
    await setBookmarkHashtags(db, bookmarkId, result.hashtags);
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

  // Get hashtags for each bookmark
  for (const row of results) {
    const { rows: hashtagRows } = await db.execute({
      sql: `SELECT h.name FROM hashtags h
            JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
            WHERE bh.bookmark_id = ?`,
      args: [row.bookmark_id],
    });
    row.hashtags = hashtagRows.map((h: any) => h.name);
  }

  return results;
}
