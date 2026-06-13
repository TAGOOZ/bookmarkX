import { useState, useEffect, useCallback } from 'react';
import type { NotificationItem } from '../../notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifs = await (window as any).api?.getNotifications?.() ?? [];
        setNotifications(notifs);
        const count = await (window as any).api?.getUnreadCount?.() ?? 0;
        setUnreadCount(count);
      } catch {
        // notifications not available yet
      }
    };
    loadNotifications();
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await (window as any).api?.markNotificationRead?.(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.warn('Failed to mark notification read:', err); }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await (window as any).api?.markAllNotificationsRead?.();
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      setUnreadCount(0);
    } catch (err) { console.warn('Failed to mark all read:', err); }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await (window as any).api?.deleteNotification?.(id);
      setNotifications((prev) => {
        const notif = prev.find(n => n.id === id);
        if (notif && notif.read === 0) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter(n => n.id !== id);
      });
    } catch (err) { console.warn('Failed to delete notification:', err); }
  }, []);

  return { notifications, unreadCount, showNotifications, setShowNotifications, markRead, markAllRead, deleteNotification };
}
