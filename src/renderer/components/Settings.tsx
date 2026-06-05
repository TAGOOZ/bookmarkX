import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    geminiApiKey: '',
    birdAuthToken: '',
    birdCt0: '',
    birdChromeProfile: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    geminiApiKey: false,
    birdAuthToken: false,
    birdCt0: false,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
  };

  const maskValue = (value: string) => {
    if (!value) return '';
    return '•'.repeat(8);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Settings saved:', formData);
    onClose();
  };

  return (
    <div className="settings-panel">
      <div className="settings-container">
        <div className="settings-header">
          <h2 className="settings-title">
            <FormattedMessage id="settings" />
          </h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <FormattedMessage id="apiKey" />
            </label>
            <input
              type={showPasswords.geminiApiKey ? 'text' : 'password'}
              className="form-input"
              value={formData.geminiApiKey}
              onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
              placeholder="Enter Gemini API Key"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FormattedMessage id="authToken" />
            </label>
            <input
              type={showPasswords.birdAuthToken ? 'text' : 'password'}
              className="form-input"
              value={formData.birdAuthToken}
              onChange={(e) => handleInputChange('birdAuthToken', e.target.value)}
              placeholder="Enter Bird Auth Token"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FormattedMessage id="ct0" />
            </label>
            <input
              type={showPasswords.birdCt0 ? 'text' : 'password'}
              className="form-input"
              value={formData.birdCt0}
              onChange={(e) => handleInputChange('birdCt0', e.target.value)}
              placeholder="Enter CT0 Cookie"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FormattedMessage id="chromeProfile" />
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.birdChromeProfile}
              onChange={(e) =>
                handleInputChange('birdChromeProfile', e.target.value)
              }
              placeholder="Enter Chrome Profile Path"
            />
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
