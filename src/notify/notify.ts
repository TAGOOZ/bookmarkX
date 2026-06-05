import { Notification } from 'electron';
import type { Bookmark } from '../fetch/types';
import type { ClassificationResult } from '../classify/types';

interface NotificationOptions {
  title: string;
  body: string;
}

export function sendNotification(options: NotificationOptions): void {
  const notification = new Notification(options);
  notification.show();
}

export function sendHighPriorityNotification(
  bookmark: Bookmark,
  classification: ClassificationResult
): void {
  const title = bookmark.title || 'Untitled Bookmark';
  const author = bookmark.author_name || bookmark.author_handle;
  const topics = classification.topics.join(', ');

  sendNotification({
    title: 'High Priority Bookmark',
    body: `${title} by ${author} — Topics: ${topics}`,
  });
}
