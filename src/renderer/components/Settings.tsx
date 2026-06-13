import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocale } from '../App';
import { SettingsFormData, DEFAULT_FORM } from './settings/types';
import UserProfileSection from './settings/UserProfileSection';
import TwitterAuthSection from './settings/TwitterAuthSection';
import GeminiApiSection from './settings/GeminiApiSection';
import PreferencesSection from './settings/PreferencesSection';

interface SettingsProps {
  onClose: () => void;
  mockMode?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onClose, mockMode = false }) => {
  const [formData, setFormData] = useState<SettingsFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLanguage, setInitialLanguage] = useState<'ar' | 'en'>('ar');
  const containerRef = useRef<HTMLDivElement>(null);
  const intl = useIntl();
  const { setLocale } = useLocale();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !containerRef.current) return;
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  useEffect(() => {
    containerRef.current?.querySelector<HTMLElement>('input, button')?.focus();
  }, [loading]);

  useEffect(() => {
    if (mockMode) {
      setFormData(DEFAULT_FORM);
      setLoading(false);
      return;
    }

    window.api.getSettings()
      .then((settings) => {
        setFormData(settings);
        setInitialLanguage(settings.language);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
        setLoading(false);
      });
  }, [mockMode]);

  const handleInputChange = (field: keyof SettingsFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mockMode) {
      onClose();
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await window.api.saveSettings(formData);
      try { localStorage.setItem('bookmarkx-setup-complete', 'true'); } catch { /* localStorage unavailable */ }
      if (formData.language !== initialLanguage) {
        setLocale(formData.language);
        setShowRestartPrompt(true);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleRestartLater = () => {
    setShowRestartPrompt(false);
    onClose();
  };

  if (loading) {
    return (
      <div className="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="settings-container">
          <p>{intl.formatMessage({ id: 'loading', defaultMessage: 'Loading...' })}</p>
        </div>
      </div>
    );
  }

  if (showRestartPrompt) {
    return (
      <div className="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="settings-container">
          <div className="mock-mode-notice">
            {intl.formatMessage({ id: 'restartPrompt' })}
          </div>
          <div className="settings-actions">
            <button type="button" className="action-button secondary-button" onClick={handleRestartLater}>
              <FormattedMessage id="restartLater" />
            </button>
            <button type="button" className="action-button primary-button" onClick={handleRestart}>
              <FormattedMessage id="restartNow" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-container" ref={containerRef} onKeyDown={handleKeyDown}>
        <div className="settings-header">
          <h2 className="settings-title">
            <FormattedMessage id="settings" />
          </h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        {mockMode && (
          <div className="mock-mode-notice">
            {intl.formatMessage({ id: 'mockModeNotice' })}
          </div>
        )}

        <form className="settings-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-banner">
              <span className="error-banner-text">{error}</span>
              <button type="button" className="error-banner-close" onClick={() => setError(null)}>×</button>
            </div>
          )}
          <UserProfileSection formData={formData} onChange={handleInputChange} disabled={mockMode} />
          {!mockMode && <TwitterAuthSection formData={formData} onChange={handleInputChange} setError={setError} />}
          <GeminiApiSection formData={formData} onChange={handleInputChange} disabled={mockMode} />
          <PreferencesSection formData={formData} onChange={handleInputChange} disabled={mockMode} />
          <div className="settings-actions">
            <button
              type="button"
              className="action-button secondary-button"
              onClick={onClose}
            >
              <FormattedMessage id="cancel" />
            </button>
            <button type="submit" className="action-button primary-button" disabled={mockMode || isSaving}>
              {isSaving ? 'Saving...' : <FormattedMessage id="save" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
