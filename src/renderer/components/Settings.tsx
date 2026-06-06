import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';

interface SettingsProps {
  onClose: () => void;
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

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<SettingsFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [twitterLogging, setTwitterLogging] = useState(false);
  const [authStatus, setAuthStatus] = useState<'detected' | 'manual' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    window.api.getSettings()
      .then((settings) => {
        setFormData(settings);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
        setLoading(false);
      });
  }, []);

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
    setError(null);
    try {
      await window.api.saveSettings(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="settings-container">
          <p>Loading...</p>
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

        <form className="settings-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message" style={{ color: 'var(--priority-high)', marginBottom: '12px' }}>
              {error}
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
                placeholder="Your name"
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
                placeholder="@username"
              />
            </div>
          </div>

          {/* X/Twitter Auth Section */}
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
                  {twitterLogging ? 'Logging in...' : 'Login with Twitter'}
                </button>
                {authStatus === 'detected' && (
                  <span className="auth-status auth-status-detected">Detected from Chrome</span>
                )}
              </div>
              <div className="option-divider">or</div>
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
                    placeholder="Enter auth_token"
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
                    placeholder="Enter ct0 cookie"
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
                      placeholder="Chrome profile name"
                    />
                    <button
                      type="button"
                      className="detect-button"
                      onClick={handleDetectChrome}
                      disabled={detecting}
                    >
                      {detecting ? '...' : 'Detect'}
                    </button>
                  </div>
                </div>
                {authStatus === 'manual' && (
                  <span className="auth-status auth-status-manual">Entered manually</span>
                )}
              </div>
            </div>
          </div>

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
                placeholder="Enter Gemini API key"
              />
            </div>
          </div>

          {/* Preferences Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <FormattedMessage id="preferences" />
            </h3>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="theme" />
              </label>
              <select
                className="form-input"
                value={formData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="language" />
              </label>
              <select
                className="form-input"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="notifications" />
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={formData.notifications}
                  onChange={(e) => handleInputChange('notifications', e.target.checked)}
                />
                <span className="toggle-switch" />
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="fetchFrequency" />
              </label>
              <select
                className="form-input"
                value={formData.fetchFrequency}
                onChange={(e) => handleInputChange('fetchFrequency', e.target.value)}
              >
                <option value="0 */3 * * *">Every 3 hours</option>
                <option value="0 */6 * * *">Every 6 hours</option>
                <option value="0 */12 * * *">Every 12 hours</option>
                <option value="0 0 * * *">Daily</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                <FormattedMessage id="aiModel" />
              </label>
              <select
                className="form-input"
                value={formData.aiModel}
                onChange={(e) => handleInputChange('aiModel', e.target.value)}
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
            <button type="submit" className="action-button primary-button">
              <FormattedMessage id="save" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
