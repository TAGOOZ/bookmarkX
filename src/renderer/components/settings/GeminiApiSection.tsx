import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { SettingsFormData } from './types';

interface GeminiApiSectionProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: string | boolean) => void;
  disabled: boolean;
}

const GeminiApiSection: React.FC<GeminiApiSectionProps> = ({ formData, onChange, disabled }) => {
  const intl = useIntl();

  return (
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
          onChange={(e) => onChange('geminiApiKey', e.target.value)}
          placeholder={intl.formatMessage({ id: 'apiKeyPlaceholder', defaultMessage: 'Enter Gemini API key' })}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default GeminiApiSection;
