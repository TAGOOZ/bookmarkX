import Database from 'better-sqlite3';
import type { ClassificationResult } from '../classify/types';

export function storeClassification(
  db: Database.Database,
  bookmarkId: string,
  result: ClassificationResult
): void {
  const classificationId = crypto.randomUUID();

  db.prepare(
    'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)'
  ).run(classificationId, bookmarkId, result.priority, result.reading_time_min);

  const insertTopic = db.prepare(
    'INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)'
  );
  const linkTopic = db.prepare(
    'INSERT OR IGNORE INTO bookmark_topics (bookmark_id, topic_id) VALUES (?, ?)'
  );
  const getTopicId = db.prepare('SELECT id FROM topics WHERE name = ?');

  for (const topicName of result.topics) {
    const topicId = crypto.randomUUID();
    insertTopic.run(topicId, topicName);

    const existing = getTopicId.get(topicName) as any;
    linkTopic.run(bookmarkId, existing.id);
  }
}

export function getClassification(
  db: Database.Database,
  bookmarkId: string
): (ClassificationResult & { topics: string[] }) | null {
  const row = db
    .prepare('SELECT * FROM classifications WHERE bookmark_id = ?')
    .get(bookmarkId) as any;

  if (!row) return null;

  const topics = db
    .prepare(
      `SELECT t.name FROM topics t
       JOIN bookmark_topics bt ON t.id = bt.topic_id
       WHERE bt.bookmark_id = ?
       ORDER BY t.name`
    )
    .all(bookmarkId)
    .map((t: any) => t.name);

  return {
    priority: row.priority,
    reading_time_min: row.reading_time_min,
    topics,
  };
}

export function getClassifiedBookmarks(
  db: Database.Database
): Array<{ bookmark_id: string; priority: string; reading_time_min: number }> {
  return db
    .prepare(
      `SELECT c.bookmark_id, c.priority, c.reading_time_min
       FROM classifications c
       ORDER BY c.created_at DESC`
    )
    .all() as Array<{ bookmark_id: string; priority: string; reading_time_min: number }>;
}
