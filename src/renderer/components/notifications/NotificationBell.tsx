import React from 'react';
import { useIntl } from 'react-intl';
import { Bell } from 'lucide-react';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onClick }) => {
  const intl = useIntl();
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <button
      className={styles.bell}
      onClick={onClick}
      title={intl.formatMessage({ id: 'notifications' })}
      aria-label={intl.formatMessage({ id: 'notifications' })}
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className={styles.badge} data-testid="unread-badge">
          {displayCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
