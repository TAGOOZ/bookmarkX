import type { Client } from '@libsql/client';
import type { NotificationRow, CountRow } from './row-types';
import { mapRow } from './row-types';

export interface Notification {
  id: string;
  type: 'status' | 'error' | 'agent_proposal';
  title: string;
  message: string | null;
  read: number;
  data: unknown;
  created_at: string;
}

interface CreateNotificationInput {
  type: 'status' | 'error' | 'agent_proposal';
  title: string;
  message?: string;
  data?: unknown;
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function createNotification(db: Client, input: CreateNotificationInput): Promise<Notification> {
  const id = generateId();
  const dataStr = input.data ? JSON.stringify(input.data) : null;

  await db.execute({
    sql: `INSERT INTO notifications (id, type, title, message, data) VALUES (?, ?, ?, ?, ?)`,
    args: [id, input.type, input.title, input.message ?? null, dataStr],
  });

  return {
    id,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    read: 0,
    data: input.data ?? null,
    created_at: new Date().toISOString(),
  };
}

export async function getNotifications(db: Client): Promise<Notification[]> {
  const { rows } = await db.execute('SELECT * FROM notifications ORDER BY created_at DESC');
  return rows
    .map((row) => {
      const r = mapRow<NotificationRow>(row, ['id', 'type', 'title', 'message', 'read', 'data', 'created_at']);
      let data: unknown = null;
      if (r.data) {
        try {
          data = JSON.parse(r.data);
        } catch {
          data = null;
        }
      }
      return {
        id: r.id,
        type: r.type as Notification['type'],
        title: r.title,
        message: r.message,
        read: r.read,
        data,
        created_at: r.created_at,
      };
    })
    .filter(Boolean);
}

export async function markAsRead(db: Client, id: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE notifications SET read = 1 WHERE id = ?',
    args: [id],
  });
}

export async function markAllRead(db: Client): Promise<void> {
  await db.execute('UPDATE notifications SET read = 1');
}

export async function deleteNotification(db: Client, id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM notifications WHERE id = ?',
    args: [id],
  });
}

export async function getUnreadCount(db: Client): Promise<number> {
  const { rows } = await db.execute('SELECT COUNT(*) as count FROM notifications WHERE read = 0');
  if (!rows || rows.length === 0) return 0;
  const r = mapRow<CountRow>(rows[0], ['count']);
  return r.count;
}
