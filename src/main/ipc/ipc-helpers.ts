import { app } from 'electron';
import { readConfig } from '../../main/user-config';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 2000;

export function checkCooldown(channel: string): boolean {
  const now = Date.now();
  const last = cooldowns.get(channel) ?? 0;
  if (now - last < COOLDOWN_MS) return false;
  cooldowns.set(channel, now);
  return true;
}

let cachedConfig: { apiKey?: string; ts: number } | null = null;

export async function getConfigEnv(): Promise<{ apiKey?: string }> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.ts < 5000) {
    return { apiKey: cachedConfig.apiKey };
  }
  const userDataDir = app.getPath('userData');
  const config = await readConfig(userDataDir);
  cachedConfig = { apiKey: config.geminiApiKey || undefined, ts: now };
  return { apiKey: config.geminiApiKey || undefined };
}

export function invalidateConfigCache() {
  cachedConfig = null;
}
