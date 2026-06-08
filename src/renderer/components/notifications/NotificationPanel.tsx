import React from 'react';
import { useIntl } from 'react-intl';
import { Check, Trash2, X } from 'lucide-react';
import styles from './NotificationPanel.module.css';

export interface NotificationItem {
  id: string;
  type: 'status' | 'error' | 'agent_proposal';
  title: string;
  message: string | null;
  read: number;
  data: unknown;
  created_at: string;
}

interface NotificationPanelProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClose,
}) => {
  const intl = useIntl();
  const hasUnread = notifications.some((n) => n.read === 0);

  return (
    <div className={styles.panel} role="dialog" aria-label={intl.formatMessage({ id: 'notifications' })}>
      <div className={styles.header}>
        <span className={styles.title}>{intl.formatMessage({ id: 'notifications' })}</span>
        <div className={styles.headerActions}>
          {hasUnread && (
            <button className={styles.headerBtn} onClick={onMarkAllRead} title={intl.formatMessage({ id: 'markAllRead' })}>
              <Check size={14} />
            </button>
          )}
          <button className={styles.headerBtn} onClick={onClose} title={intl.formatMessage({ id: 'closeSettings' })}>
            <X size={14} />
          </button>
        </div>
      </div>
      <div className={styles.list}>
        {notifications.length === 0 ? (
          <div className={styles.empty}>{intl.formatMessage({ id: 'noNotifications' })}</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`${styles.item} ${notif.read === 0 ? styles.unread : ''}`}
            >
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>{notif.title}</div>
                {notif.message && <div className={styles.itemMessage}>{notif.message}</div>}
                <div className={styles.itemTime}>{formatTime(notif.created_at)}</div>
              </div>
              <div className={styles.itemActions}>
                {notif.read === 0 && (
                  <button
                    className={styles.itemBtn}
                    onClick={() => onMarkRead(notif.id)}
                    title={intl.formatMessage({ id: 'markAllRead' })}
                  >
                    <Check size={12} />
                  </button>
                )}
                <button
                  className={styles.itemBtn}
                  onClick={() => onDelete(notif.id)}
                  title={intl.formatMessage({ id: 'clearAll' })}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
