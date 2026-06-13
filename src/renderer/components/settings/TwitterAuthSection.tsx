import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { SettingsFormData } from './types';

interface TwitterAuthSectionProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: string | boolean) => void;
  setError: (msg: string | null) => void;
}

const TwitterAuthSection: React.FC<TwitterAuthSectionProps> = ({ formData, onChange, setError }) => {
  const intl = useIntl();
  const [detecting, setDetecting] = useState(false);
  const [twitterLogging, setTwitterLogging] = useState(false);
  const [authStatus, setAuthStatus] = useState<'detected' | 'manual' | null>(null);

  const handleDetectChrome = async () => {
    setDetecting(true);
    setError(null);
    try {
      const result = await window.api.detectChromeProfile();
      if (result.profiles.length > 0) {
        onChange('birdChromeProfile', result.selectedProfile);
        if (result.authToken) onChange('birdAuthToken', result.authToken);
        if (result.ct0) onChange('birdCt0', result.ct0);
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
        onChange('birdAuthToken', result.authToken);
        onChange('birdCt0', result.ct0);
        setAuthStatus('detected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Twitter login failed');
    } finally {
      setTwitterLogging(false);
    }
  };

  return (
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
                onChange('birdAuthToken', e.target.value);
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
                onChange('birdCt0', e.target.value);
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
                onChange={(e) => onChange('birdChromeProfile', e.target.value)}
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
  );
};

export default TwitterAuthSection;
