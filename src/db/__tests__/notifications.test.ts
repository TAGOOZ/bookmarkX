import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import { createNotification, getNotifications, markAsRead, markAllRead, deleteNotification, getUnreadCount } from '../notifications';

describe('notifications', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(() => db.close());

  describe('createNotification', () => {
    it('creates a notification', async () => {
      await createNotification(db, {
        type: 'status',
        title: 'Fetch Complete',
        message: 'Bookmarks fetched successfully',
      });

      const { rows } = await db.execute('SELECT * FROM notifications');
      expect(rows).toHaveLength(1);
      const row = rows[0] as any;
      expect(row.type).toBe('status');
      expect(row.title).toBe('Fetch Complete');
      expect(row.message).toBe('Bookmarks fetched successfully');
      expect(row.read).toBe(0);
    });

    it('generates a UUID for the notification id', async () => {
      await createNotification(db, {
        type: 'status',
        title: 'Test',
      });

      const { rows } = await db.execute('SELECT id FROM notifications');
      const row = rows[0] as any;
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('stores data as JSON string', async () => {
      await createNotification(db, {
        type: 'status',
        title: 'Test',
        data: { bookmarkId: 'bm-1', count: 5 },
      });

      const { rows } = await db.execute('SELECT data FROM notifications');
      const row = rows[0] as any;
      expect(JSON.parse(row.data)).toEqual({ bookmarkId: 'bm-1', count: 5 });
    });
  });

  describe('getNotifications', () => {
    it('returns empty array when no notifications exist', async () => {
      const result = await getNotifications(db);
      expect(result).toEqual([]);
    });

    it('returns all notifications', async () => {
      await createNotification(db, { type: 'status', title: 'First' });
      await createNotification(db, { type: 'error', title: 'Second' });

      const result = await getNotifications(db);
      expect(result).toHaveLength(2);
    });

    it('parses data field from JSON', async () => {
      await createNotification(db, {
        type: 'status',
        title: 'Test',
        data: { key: 'value' },
      });

      const result = await getNotifications(db);
      expect(result[0].data).toEqual({ key: 'value' });
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      await createNotification(db, { type: 'status', title: 'Test' });
      const result = await getNotifications(db);
      const notifId = result[0].id;

      await markAsRead(db, notifId);

      const { rows } = await db.execute({
        sql: 'SELECT read FROM notifications WHERE id = ?',
        args: [notifId],
      });
      expect((rows[0] as any).read).toBe(1);
    });
  });

  describe('markAllRead', () => {
    it('marks all notifications as read', async () => {
      await createNotification(db, { type: 'status', title: 'First' });
      await createNotification(db, { type: 'error', title: 'Second' });

      await markAllRead(db);

      const { rows } = await db.execute('SELECT read FROM notifications');
      expect(rows.every((r: any) => r.read === 1)).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('deletes a notification by id', async () => {
      await createNotification(db, { type: 'status', title: 'To delete' });
      const result = await getNotifications(db);
      const notifId = result[0].id;

      await deleteNotification(db, notifId);

      const remaining = await getNotifications(db);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('getUnreadCount', () => {
    it('returns 0 when no notifications exist', async () => {
      const count = await getUnreadCount(db);
      expect(count).toBe(0);
    });

    it('counts only unread notifications', async () => {
      await createNotification(db, { type: 'status', title: 'Read' });
      await createNotification(db, { type: 'error', title: 'Unread' });
      const result = await getNotifications(db);
      const readNotif = result.find((n: any) => n.title === 'Read')!;
      await markAsRead(db, readNotif.id);

      const count = await getUnreadCount(db);
      expect(count).toBe(1);
    });
  });
});
