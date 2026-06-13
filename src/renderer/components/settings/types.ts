export interface SettingsFormData {
  name: string; twitterHandle: string; geminiApiKey: string;
  birdAuthToken: string; birdCt0: string; birdChromeProfile: string;
  theme: 'dark' | 'light'; language: 'ar' | 'en';
  notifications: boolean; fetchFrequency: string; aiModel: string;
}

export const DEFAULT_FORM: SettingsFormData = {
  name: '', twitterHandle: '', geminiApiKey: '',
  birdAuthToken: '', birdCt0: '', birdChromeProfile: '',
  theme: 'dark', language: 'ar', notifications: true,
  fetchFrequency: '0 */6 * * *', aiModel: 'gemini-2.0-flash',
};
