import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
      <div className="settings-panel">
        <div className="settings-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
          {error && (
            <div className="error-message" style={{ color: 'var(--priority-high)', marginBottom: '12px' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">
              <FormattedMessage id="apiKey" />
            </label>
            <input
              type="password"
              className="form-input"
              value={formData.geminiApiKey}
              onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
              placeholder="أدخل مفتاح Gemini API"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FormattedMessage id="authToken" />
            </label>
            <input
              type="password"
              className="form-input"
              value={formData.birdAuthToken}
              onChange={(e) => handleInputChange('birdAuthToken', e.target.value)}
              placeholder="أدخل رمز المصادقة"
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
              onChange={(e) => handleInputChange('birdCt0', e.target.value)}
              placeholder="أدخل ملف تعريف الارتباط CT0"
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
              placeholder="أدخل مسار ملف تعريف Chrome"
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
