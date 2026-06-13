import type { Client } from '@libsql/client';
import { classifyBookmark } from '../classify/classifier';
import { getUnclassifiedBookmarks } from '../db/bookmarks';
import { createClassification } from '../db/classifications';
import { createNotification } from '../db/notifications';
import { sendHighPriorityNotification } from '../notify/notify';

import type { ClassifierOptions } from '../classify/types';

let isRunning = false;

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
        await createClassification(db, bookmark.id, result);
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
