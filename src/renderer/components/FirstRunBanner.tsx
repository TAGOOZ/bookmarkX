import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

interface FirstRunBannerProps {
  onOpenSettings: () => void;
}

const SETUP_COMPLETE_KEY = 'bookmarkx-setup-complete';

const FirstRunBanner: React.FC<FirstRunBannerProps> = ({ onOpenSettings }) => {
  const intl = useIntl();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.api.getSettings().then((settings) => {
      const hasAuth = settings.birdAuthToken || settings.birdCt0;
      const setupDismissed = localStorage.getItem(SETUP_COMPLETE_KEY) === 'true';
      if (!hasAuth && !setupDismissed) {
        setVisible(true);
        document.documentElement.classList.add('first-run-banner-visible');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SETUP_COMPLETE_KEY && e.newValue === 'true') {
        setVisible(false);
        document.documentElement.classList.remove('first-run-banner-visible');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    document.documentElement.classList.remove('first-run-banner-visible');
  };

  const handleOpenSettings = () => {
    onOpenSettings();
  };

  if (!visible) return null;

  return (
    <div className="first-run-banner" role="status" aria-live="polite">
      <span className="first-run-banner-text">
        <FormattedMessage id="firstRunBanner" />
      </span>
      <button
        type="button"
        className="first-run-banner-action"
        onClick={handleOpenSettings}
      >
        <FormattedMessage id="firstRunBannerAction" />
      </button>
      <button
        type="button"
        className="first-run-banner-dismiss"
        onClick={handleDismiss}
        aria-label={intl.formatMessage({ id: 'dismissSetupBanner', defaultMessage: 'Dismiss' })}
      >
        x
      </button>
    </div>
  );
};

export default FirstRunBanner;
