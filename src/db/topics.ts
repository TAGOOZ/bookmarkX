import type { Client } from '@libsql/client';
import type { TopicRow, TopicCountRow, BookmarkRow } from './row-types';
import { mapRow } from './row-types';

export interface Topic {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: 'ai' | 'user';
  created_at: string;
}

export interface TopicTreeNode extends Topic {
  children: TopicTreeNode[];
  bookmark_count: number;
}

const TOPIC_FIELDS: (keyof TopicRow)[] = ['id', 'name', 'parent_id', 'created_by', 'created_at'];

export async function createTopic(
  db: Client,
  name: string,
  parentId: string | null = null,
  createdBy: 'ai' | 'user' = 'user',
): Promise<Topic> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO topics (id, name, parent_id, created_by)
          VALUES (?, ?, ?, ?)`,
    args: [id, name, parentId, createdBy],
  });

  return { id, name, parent_id: parentId, created_by: createdBy, created_at: new Date().toISOString() };
}

export async function getTopic(db: Client, topicId: string): Promise<Topic | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM topics WHERE id = ?',
    args: [topicId],
  });
  const row = rows[0];
  if (!row) return null;
  const r = mapRow<TopicRow>(row, TOPIC_FIELDS);
  return { id: r.id, name: r.name, parent_id: r.parent_id, created_by: r.created_by as Topic['created_by'], created_at: r.created_at };
}

export async function getTopicByName(
  db: Client,
  name: string,
  parentId: string | null = null,
): Promise<Topic | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM topics WHERE name = ? AND parent_id IS ?',
    args: [name, parentId],
  });
  const row = rows[0];
  if (!row) return null;
  const r = mapRow<TopicRow>(row, TOPIC_FIELDS);
  return { id: r.id, name: r.name, parent_id: r.parent_id, created_by: r.created_by as Topic['created_by'], created_at: r.created_at };
}

export async function getOrCreateTopic(
  db: Client,
  name: string,
  parentId: string | null = null,
  createdBy: 'ai' | 'user' = 'user',
): Promise<Topic> {
  const existing = await getTopicByName(db, name, parentId);
  if (existing) return existing;
  return createTopic(db, name, parentId, createdBy);
}

export async function renameTopic(
  db: Client,
  topicId: string,
  newName: string,
): Promise<void> {
  await db.execute({
    sql: 'UPDATE topics SET name = ? WHERE id = ?',
    args: [newName, topicId],
  });
}

export async function reparentTopic(
  db: Client,
  topicId: string,
  newParentId: string | null,
): Promise<void> {
  await db.execute({
    sql: 'UPDATE topics SET parent_id = ? WHERE id = ?',
    args: [newParentId, topicId],
  });
}

export async function deleteTopic(
  db: Client,
  topicId: string,
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM topics WHERE id = ?',
    args: [topicId],
  });
}

export async function moveBookmarkToTopic(
  db: Client,
  bookmarkId: string,
  topicId: string | null,
): Promise<void> {
  await db.execute({
    sql: 'UPDATE bookmarks SET topic_id = ? WHERE id = ?',
    args: [topicId, bookmarkId],
  });
}

export async function getTopicTree(db: Client): Promise<TopicTreeNode[]> {
  const { rows } = await db.execute(
    'SELECT * FROM topics ORDER BY name',
  );

  const allTopics = rows.map((row) => {
    const r = mapRow<TopicRow>(row, TOPIC_FIELDS);
    return {
      id: r.id,
      name: r.name,
      parent_id: r.parent_id,
      created_by: r.created_by as Topic['created_by'],
      created_at: r.created_at,
      children: [] as TopicTreeNode[],
      bookmark_count: 0,
    };
  });

  // Get bookmark counts per topic
  const { rows: countRows } = await db.execute(
    `SELECT topic_id, COUNT(*) as cnt FROM bookmarks
     WHERE topic_id IS NOT NULL GROUP BY topic_id`,
  );
  const countMap = new Map<string, number>();
  for (const row of countRows) {
    const r = mapRow<TopicCountRow>(row, ['topic_id', 'cnt']);
    countMap.set(r.topic_id, r.cnt);
  }

  // Apply counts
  for (const topic of allTopics) {
    topic.bookmark_count = countMap.get(topic.id) ?? 0;
  }

  // Build tree
  const topicMap = new Map<string, TopicTreeNode>();
  for (const topic of allTopics) {
    topicMap.set(topic.id, topic);
  }

  const roots: TopicTreeNode[] = [];
  for (const topic of allTopics) {
    if (topic.parent_id) {
      const parent = topicMap.get(topic.parent_id);
      if (parent) {
        parent.children.push(topic);
      } else {
        roots.push(topic);
      }
    } else {
      roots.push(topic);
    }
  }

  return roots;
}

export async function getBookmarksByTopic(
  db: Client,
  topicId: string,
): Promise<Array<{ id: string; title: string; url: string; topic_id: string | null }>> {
  const { rows } = await db.execute({
    sql: `SELECT id, title, title_ar, title_en, url, topic_id FROM bookmarks
          WHERE topic_id = ? ORDER BY created_at DESC`,
    args: [topicId],
  });

  return rows.map((row) => {
    const r = mapRow<BookmarkRow>(row, ['id', 'title', 'title_ar', 'title_en', 'url', 'topic_id']);
    return {
      id: r.id,
      title: r.title_en || r.title_ar || r.title || 'Untitled',
      url: r.url,
      topic_id: r.topic_id,
    };
  });
}
