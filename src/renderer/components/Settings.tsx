import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocale } from '../App';

interface SettingsProps {
  onClose: () => void;
  mockMode?: boolean;
}

interface SettingsFormData {
  name: string;
  twitterHandle: string;
  geminiApiKey: string;
  birdAuthToken: string;
  birdCt0: string;
  birdChromeProfile: string;
  theme: 'dark' | 'light';
  language: 'ar' | 'en';
  notifications: boolean;
  fetchFrequency: string;
  aiModel: string;
}

const DEFAULT_FORM: SettingsFormData = {
  name: '',
  twitterHandle: '',
  geminiApiKey: '',
  birdAuthToken: '',
  birdCt0: '',
  birdChromeProfile: '',
  theme: 'dark',
  language: 'ar',
  notifications: true,
  fetchFrequency: '0 */6 * * *',
  aiModel: 'gemini-2.0-flash',
};

const Settings: React.FC<SettingsProps> = ({ onClose, mockMode = false }) => {
  const [formData, setFormData] = useState<SettingsFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [twitterLogging, setTwitterLogging] = useState(false);
  const [authStatus, setAuthStatus] = useState<'detected' | 'manual' | null>(null);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [initialLanguage, setInitialLanguage] = useState<'ar' | 'en'>('ar');
  const containerRef = useRef<HTMLDivElement>(null);
  const intl = useIntl();
  const { setLocale } = useLocale();

  // Auto-dismiss error after 5 seconds
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

  const handleDetectChrome = async () => {
    setDetecting(true);
    setError(null);
    try {
      const result = await window.api.detectChromeProfile();
      if (result.profiles.length > 0) {
        setFormData((prev) => ({
          ...prev,
          birdChromeProfile: result.selectedProfile,
          birdAuthToken: result.authToken || prev.birdAuthToken,
          birdCt0: result.ct0 || prev.birdCt0,
        }));
        if (result.authToken && result.ct0) {
          setAuthStatus('detected');
        } else if (result.warning) {
          setError(result.warning);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const handleTwitterLogin = async () => {
    setTwitterLogging(true);
    setError(null);
    try {
      const result = await window.api.twitterLogin();
      if ('error' in result) {
        if (result.error !== 'cancelled') {
          setError(result.error);
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          birdAuthToken: result.authToken,
          birdCt0: result.ct0,
        }));
        setAuthStatus('detected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Twitter login failed');
    } finally {
      setTwitterLogging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mockMode) {
      onClose();
      return;
    }
    setError(null);
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
            <button
              type="button"
              className="action-button secondary-button"
              onClick={handleRestartLater}
            >
              <FormattedMessage id="restartLater" />
            </button>
            <button
              type="button"
              className="action-button primary-button"
              onClick={handleRestart}
            >
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

          {/* User Profile Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <FormattedMessage id="userProfile" />
            </h3>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="name" />
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={intl.formatMessage({ id: 'namePlaceholder', defaultMessage: 'Your name' })}
                disabled={mockMode}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="twitterHandle" />
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.twitterHandle}
                onChange={(e) => handleInputChange('twitterHandle', e.target.value)}
                placeholder={intl.formatMessage({ id: 'twitterHandlePlaceholder', defaultMessage: '@username' })}
                disabled={mockMode}
              />
            </div>
          </div>

          {/* X/Twitter Auth Section - Hidden in mock mode */}
          {!mockMode && (
            <div className="settings-section">
              <h3 className="settings-section-title">
                <FormattedMessage id="xAuth" />
              </h3>
              <div className="auth-options">
                <div className="auth-option">
                  <button
                    type="button"
                    className="twitter-login-button"
                    onClick={handleTwitterLogin}
                    disabled={twitterLogging}
                  >
                    {twitterLogging
                      ? intl.formatMessage({ id: 'loggingIn', defaultMessage: 'Logging in...' })
                      : intl.formatMessage({ id: 'loginWithTwitter', defaultMessage: 'Login with Twitter' })}
                  </button>
                  {authStatus === 'detected' && (
                    <span className="auth-status auth-status-detected">
                      <FormattedMessage id="detectedFromChrome" />
                    </span>
                  )}
                </div>
                <div className="option-divider">
                  <FormattedMessage id="or" />
                </div>
                <div className="auth-option">
                  <div className="form-group">
                    <label className="form-label">
                      <FormattedMessage id="authToken" />
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      value={formData.birdAuthToken}
                      onChange={(e) => {
                        handleInputChange('birdAuthToken', e.target.value);
                        setAuthStatus('manual');
                      }}
                      placeholder={intl.formatMessage({ id: 'authTokenPlaceholder', defaultMessage: 'Enter auth_token' })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <FormattedMessage id="ct0" />
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      value={formData.birdCt0}
                      onChange={(e) => {
                        handleInputChange('birdCt0', e.target.value);
                        setAuthStatus('manual');
                      }}
                      placeholder={intl.formatMessage({ id: 'ct0Placeholder', defaultMessage: 'Enter ct0 cookie' })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <FormattedMessage id="chromeProfile" />
                    </label>
                    <div className="detect-input-row">
                      <input
                        type="text"
                        className="form-input"
                        value={formData.birdChromeProfile}
                        onChange={(e) => handleInputChange('birdChromeProfile', e.target.value)}
                        placeholder={intl.formatMessage({ id: 'chromeProfilePlaceholder', defaultMessage: 'Chrome profile name' })}
                      />
                      <button
                        type="button"
                        className="detect-button"
                        onClick={handleDetectChrome}
                        disabled={detecting}
                      >
                        {detecting ? '...' : intl.formatMessage({ id: 'detect', defaultMessage: 'Detect' })}
                      </button>
                    </div>
                  </div>
                  {authStatus === 'manual' && (
                    <span className="auth-status auth-status-manual">
                      <FormattedMessage id="enteredManually" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gemini API Key Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <FormattedMessage id="geminiApi" />
            </h3>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="apiKey" />
              </label>
              <input
                type="password"
                className="form-input"
                value={formData.geminiApiKey}
                onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
                placeholder={intl.formatMessage({ id: 'apiKeyPlaceholder', defaultMessage: 'Enter Gemini API key' })}
                disabled={mockMode}
              />
            </div>
          </div>

          {/* Preferences Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <FormattedMessage id="preferences" />
            </h3>
            <div className="pref-row">
              <span className="pref-label">
                <FormattedMessage id="theme" />
              </span>
              <select
                className="pref-select"
                value={formData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                disabled={mockMode}
              >
                <option value="dark">{intl.formatMessage({ id: 'dark', defaultMessage: 'Dark' })}</option>
                <option value="light">{intl.formatMessage({ id: 'light', defaultMessage: 'Light' })}</option>
              </select>
            </div>
            <div className="pref-row">
              <span className="pref-label">
                <FormattedMessage id="language" />
              </span>
              <select
                className="pref-select"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                disabled={mockMode}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="pref-row">
              <span className="pref-label">
                <FormattedMessage id="notifications" />
              </span>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={formData.notifications}
                  onChange={(e) => handleInputChange('notifications', e.target.checked)}
                  disabled={mockMode}
                />
                <span className="toggle-switch" />
              </label>
            </div>
            <div className="pref-row">
              <span className="pref-label">
                <FormattedMessage id="fetchFrequency" />
              </span>
              <select
                className="pref-select"
                value={formData.fetchFrequency}
                onChange={(e) => handleInputChange('fetchFrequency', e.target.value)}
                disabled={mockMode}
              >
                <option value="0 */3 * * *">{intl.formatMessage({ id: 'every3Hours', defaultMessage: 'Every 3 hours' })}</option>
                <option value="0 */6 * * *">{intl.formatMessage({ id: 'every6Hours', defaultMessage: 'Every 6 hours' })}</option>
                <option value="0 */12 * * *">{intl.formatMessage({ id: 'every12Hours', defaultMessage: 'Every 12 hours' })}</option>
                <option value="0 0 * * *">{intl.formatMessage({ id: 'daily', defaultMessage: 'Daily' })}</option>
              </select>
            </div>
            <div className="pref-row">
              <span className="pref-label">
                <FormattedMessage id="aiModel" />
              </span>
              <select
                className="pref-select"
                value={formData.aiModel}
                onChange={(e) => handleInputChange('aiModel', e.target.value)}
                disabled={mockMode}
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>
           </div>

          <div className="settings-actions">
            <button
              type="button"
              className="action-button secondary-button"
              onClick={onClose}
            >
              <FormattedMessage id="cancel" />
            </button>
            <button type="submit" className="action-button primary-button" disabled={mockMode}>
              <FormattedMessage id="save" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
