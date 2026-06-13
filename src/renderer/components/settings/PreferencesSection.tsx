import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { SettingsFormData } from './types';

interface PreferencesSectionProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: string | boolean) => void;
  disabled: boolean;
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({ formData, onChange, disabled }) => {
  const intl = useIntl();

  return (
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
          onChange={(e) => onChange('theme', e.target.value)}
          disabled={disabled}
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
          onChange={(e) => onChange('language', e.target.value)}
          disabled={disabled}
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
            onChange={(e) => onChange('notifications', e.target.checked)}
            disabled={disabled}
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
          onChange={(e) => onChange('fetchFrequency', e.target.value)}
          disabled={disabled}
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
          onChange={(e) => onChange('aiModel', e.target.value)}
          disabled={disabled}
        >
          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>
    </div>
  );
};

export default PreferencesSection;
