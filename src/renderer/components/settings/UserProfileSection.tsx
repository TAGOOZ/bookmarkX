import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { SettingsFormData } from './types';

interface UserProfileSectionProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: string | boolean) => void;
  disabled: boolean;
}

const UserProfileSection: React.FC<UserProfileSectionProps> = ({ formData, onChange, disabled }) => {
  const intl = useIntl();

  return (
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
          onChange={(e) => onChange('name', e.target.value)}
          placeholder={intl.formatMessage({ id: 'namePlaceholder', defaultMessage: 'Your name' })}
          disabled={disabled}
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
          onChange={(e) => onChange('twitterHandle', e.target.value)}
          placeholder={intl.formatMessage({ id: 'twitterHandlePlaceholder', defaultMessage: '@username' })}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default UserProfileSection;
