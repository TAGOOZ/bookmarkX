import type { Client } from '@libsql/client';

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
  return rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    data: row.data ? JSON.parse(row.data) : null,
    created_at: row.created_at,
  }));
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
  return (rows[0] as any).count;
}
