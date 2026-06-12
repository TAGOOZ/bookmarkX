import { useState, useCallback } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState<string | null>(null);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, setNotification, clearNotification };
}