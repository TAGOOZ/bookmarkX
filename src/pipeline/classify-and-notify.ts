import type { Client } from '@libsql/client';
import { classifyBookmark } from '../classify/classifier';
import { storeClassification, getClassification } from '../db/classifications';
import { getStoredBookmarks } from '../db/bookmarks';
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
    const bookmarks = await getStoredBookmarks(db);
    let classified = 0;
    let notified = 0;
    let errors = 0;

    for (const bookmark of bookmarks) {
      const existing = await getClassification(db, bookmark.id);
      if (existing) continue;

      try {
        const result = await classifyBookmark(bookmark, options);
        await storeClassification(db, bookmark.id, result);
        classified++;

        if (result.priority === 'high') {
          sendHighPriorityNotification(bookmark, result);
          notified++;
        }
    } catch (err) {
      console.error(`Failed to classify bookmark ${bookmark.id}:`, err);
      errors++;
    }
    }

    return { classified, notified, errors };
  } finally {
    isRunning = false;
  }
}
