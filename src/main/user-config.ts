import fs from 'node:fs';
import path from 'node:path';

export interface UserConfig {
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

export const DEFAULT_CONFIG: UserConfig = {
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

const CONFIG_FILE = 'user.json';

export function getConfigPath(userDataDir: string): string {
  return path.join(userDataDir, CONFIG_FILE);
}

export function configExists(userDataDir: string): boolean {
  return fs.existsSync(getConfigPath(userDataDir));
}

export function readConfig(userDataDir: string): UserConfig {
  const configPath = getConfigPath(userDataDir);
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.warn('Failed to read user config, using defaults:', err);
    return { ...DEFAULT_CONFIG };
  }
}

export async function writeConfig(userDataDir: string, config: UserConfig): Promise<void> {
  const configPath = getConfigPath(userDataDir);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
