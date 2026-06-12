import fs from 'node:fs';
import path from 'node:path';
import type { UserConfig } from '../shared/types';

export type { UserConfig };

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

let configCache: UserConfig | null = null;

export async function readConfig(userDataDir: string): Promise<UserConfig> {
  if (configCache) return configCache;

  const configPath = getConfigPath(userDataDir);
  if (!fs.existsSync(configPath)) {
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }

  try {
    const raw = await fs.promises.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    configCache = { ...DEFAULT_CONFIG, ...parsed };
    return configCache;
  } catch (err) {
    console.warn('Failed to read user config, using defaults:', err);
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }
}

export function resetConfigCache(): void {
  configCache = null;
}

export async function writeConfig(userDataDir: string, config: UserConfig): Promise<void> {
  configCache = null;
  const configPath = getConfigPath(userDataDir);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
