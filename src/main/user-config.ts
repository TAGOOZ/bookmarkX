import fs from 'node:fs';
import path from 'node:path';
import { safeStorage } from 'electron';
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

const SECRET_KEYS = ['geminiApiKey', 'birdAuthToken', 'birdCt0'] as const;

function isSafeStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

export async function readSecureConfig(userDataDir: string): Promise<Partial<UserConfig>> {
  const result: Partial<UserConfig> = {};
  if (!isSafeStorageAvailable()) return result;
  for (const key of SECRET_KEYS) {
    try {
      const encrypted = await fs.promises.readFile(
        path.join(userDataDir, `.secret-${key}`), 'utf-8'
      );
      const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
      (result as any)[key] = decrypted;
    } catch { /* file doesn't exist or decryption failed */ }
  }
  return result;
}

export async function writeSecureConfig(userDataDir: string, config: UserConfig): Promise<void> {
  if (!isSafeStorageAvailable()) return;
  for (const key of SECRET_KEYS) {
    const value = (config as any)[key];
    if (value) {
      const encrypted = safeStorage.encryptString(value);
      await fs.promises.writeFile(
        path.join(userDataDir, `.secret-${key}`),
        encrypted.toString('base64'),
        'utf-8'
      );
    }
  }
}

export async function removePlaintextSecrets(userDataDir: string): Promise<void> {
  const configPath = getConfigPath(userDataDir);
  if (!fs.existsSync(configPath)) return;
  try {
    const raw = await fs.promises.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    let changed = false;
    for (const key of SECRET_KEYS) {
      if (parsed[key]) { delete parsed[key]; changed = true; }
    }
    if (changed) {
      await fs.promises.writeFile(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
    }
  } catch { /* ignore parse errors */ }
}

export async function readConfig(userDataDir: string): Promise<UserConfig> {
  if (configCache) return configCache;

  const configPath = getConfigPath(userDataDir);
  let base: UserConfig = { ...DEFAULT_CONFIG };
  if (fs.existsSync(configPath)) {
    try {
      const raw = await fs.promises.readFile(configPath, 'utf-8');
      base = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch { /* use defaults */ }
  }
  const secrets = await readSecureConfig(userDataDir);
  configCache = { ...base, ...secrets };
  return configCache;
}

export function resetConfigCache(): void {
  configCache = null;
}

export async function writeConfig(userDataDir: string, config: UserConfig): Promise<void> {
  configCache = null;
  await writeSecureConfig(userDataDir, config);
  const safeConfig = Object.fromEntries(
    Object.entries(config).filter(([k]) => !(SECRET_KEYS as readonly string[]).includes(k))
  ) as UserConfig;
  const configPath = getConfigPath(userDataDir);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) { await fs.promises.mkdir(dir, { recursive: true }); }
  await fs.promises.writeFile(configPath, JSON.stringify(safeConfig, null, 2), 'utf-8');
}
