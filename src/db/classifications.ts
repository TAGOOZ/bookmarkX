import type { Client } from '@libsql/client';
import type { ClassificationResult } from '../classify/types';
import { getOrCreateTopic, moveBookmarkToTopic } from './topics';
import { setBookmarkHashtags } from './hashtags';
import type { ClassificationRow, TopicNameRow, HashtagJoinRow, ClassificationJoinedRow } from './row-types';
import { mapRow } from './row-types';

export async function createClassification(
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

  const row = rows[0];
  if (!row) return null;
  const r = mapRow<ClassificationRow>(row, ['id', 'bookmark_id', 'priority', 'reading_time_min', 'created_at']) as ClassificationRow;

  // Get topic from bookmarks.topic_id
  const { rows: topicRows } = await db.execute({
    sql: `SELECT t.name FROM topics t
       JOIN bookmarks b ON t.id = b.topic_id
       WHERE b.id = ?`,
    args: [bookmarkId],
  });
  const topicName = topicRows[0] ? mapRow<TopicNameRow>(topicRows[0], ['name']).name : 'Uncategorized';

  // Get hashtags
  const { rows: hashtagRows } = await db.execute({
    sql: `SELECT h.name FROM hashtags h
       JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
       WHERE bh.bookmark_id = ?
       ORDER BY h.name`,
    args: [bookmarkId],
  });
  const hashtags = hashtagRows.map((h) => mapRow<{ name: string }>(h, ['name']).name);

  return {
    priority: r.priority as ClassificationResult['priority'],
    reading_time_min: r.reading_time_min as number,
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

  const results = rows.map((row) => mapRow<ClassificationJoinedRow>(row, ['bookmark_id', 'priority', 'reading_time_min', 'topic']));

  // Batch fetch all hashtags in one query
  const bookmarkIds = results.map((r) => r.bookmark_id);
  const hashtagMap = new Map<string, string[]>();
  if (bookmarkIds.length > 0) {
    const placeholders = bookmarkIds.map(() => '?').join(',');
    const { rows: allHashtagRows } = await db.execute({
      sql: `SELECT bh.bookmark_id, h.name FROM hashtags h
            JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
            WHERE bh.bookmark_id IN (${placeholders})
            ORDER BY h.name`,
      args: bookmarkIds,
    });

    for (const row of allHashtagRows) {
      const r = mapRow<HashtagJoinRow>(row, ['bookmark_id', 'name']);
      const existing = hashtagMap.get(r.bookmark_id) || [];
      existing.push(r.name);
      hashtagMap.set(r.bookmark_id, existing);
    }
  }

  return results.map((row) => ({
    bookmark_id: row.bookmark_id,
    priority: row.priority,
    reading_time_min: row.reading_time_min,
    topic: row.topic,
    hashtags: hashtagMap.get(row.bookmark_id) || [],
  }));
}
