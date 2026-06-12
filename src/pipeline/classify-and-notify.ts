import type { Client } from '@libsql/client';
import { classifyBookmark } from '../classify/classifier';
import { storeClassification } from '../db/classifications';
import { createNotification } from '../db/notifications';
import { sendHighPriorityNotification } from '../notify/notify';

import type { Bookmark } from '../fetch/types';
import type { ClassifierOptions } from '../classify/types';

let isRunning = false;

async function getUnclassifiedBookmarks(db: Client): Promise<Bookmark[]> {
  const { rows } = await db.execute({
    sql: `SELECT b.* FROM bookmarks b
          LEFT JOIN classifications c ON c.bookmark_id = b.id
          WHERE c.id IS NULL
          ORDER BY b.created_at DESC`,
    args: [],
  });
  return rows.map((row: any) => ({
    id: row.id,
    tweet_id: row.tweet_id,
    url: row.url,
    content_type: row.content_type,
    title: row.title,
    title_ar: row.title_ar,
    title_en: row.title_en,
    author_name: row.author_name,
    author_handle: row.author_handle,
    tweet_text: row.tweet_text,
    fetched_at: row.fetched_at,
  }));
}

interface ClassifyResult {
  classified: number;
  notified: number;
  errors: number;
}

export async function classifyAndNotify(
  db: Client,
  options: ClassifierOptions = {}
): Promise<ClassifyResult> {
  if (isRunning) {
    return { classified: 0, notified: 0, errors: 0 };
  }
  isRunning = true;
  try {
    const bookmarks = await getUnclassifiedBookmarks(db);
    let classified = 0;
    let notified = 0;
    let errors = 0;

    for (const bookmark of bookmarks) {
      try {
        const result = await classifyBookmark(bookmark, options);
        await storeClassification(db, bookmark.id, result);
        classified++;

        if (result.priority === 'high') {
          sendHighPriorityNotification(bookmark, result);
          await createNotification(db, {
            type: 'status',
            title: 'High Priority Bookmark',
            message: `${bookmark.title || 'Untitled'} by ${bookmark.author_name || bookmark.author_handle || 'Unknown'} — Topic: ${result.topic}`,
            data: { bookmarkId: bookmark.id, priority: result.priority, topic: result.topic },
          });
          notified++;
        }
      } catch (err) {
        console.error(`Failed to classify bookmark ${bookmark.id}:`, err);
        errors++;
      }
    }

    if (classified > 0) {
      await createNotification(db, {
        type: 'status',
        title: 'Classification Complete',
        message: `${classified} bookmarks classified, ${notified} high priority`,
        data: { classified, notified, errors },
      });
    }

    return { classified, notified, errors };
  } finally {
    isRunning = false;
  }
}
