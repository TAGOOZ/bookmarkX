import fs from 'node:fs';
import path from 'node:path';

export interface ChromeProfileDetection {
  profiles: string[];
  selectedProfile: string;
  authToken?: string;
  ct0?: string;
}

const PROFILE_DIRS = ['Default', 'Profile 1', 'Profile 2', 'Profile 3', 'Profile 4', 'Profile 5'];

export function detectChromeProfiles(chromeDir: string): string[] {
  if (!fs.existsSync(chromeDir)) {
    return [];
  }

  const entries = fs.readdirSync(chromeDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && PROFILE_DIRS.includes(e.name))
    .map((e) => e.name)
    .sort((a, b) => {
      if (a === 'Default') return -1;
      if (b === 'Default') return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
}

export async function extractTwitterCookies(
  profilePath: string,
): Promise<{ authToken: string | null; ct0: string | null }> {
  const cookiesDbPath = path.join(profilePath, 'Cookies');
  if (!fs.existsSync(cookiesDbPath)) {
    return { authToken: null, ct0: null };
  }

  try {
    const { createClient } = await import('@libsql/client');
    const db = createClient({ url: `file:${cookiesDbPath}` });

    const { rows: authRows } = await db.execute({
      sql: `SELECT encrypted_value FROM cookies WHERE host_key LIKE '%x.com%' AND name = 'auth_token' LIMIT 1`,
      args: [],
    });

    const { rows: ct0Rows } = await db.execute({
      sql: `SELECT encrypted_value FROM cookies WHERE host_key LIKE '%x.com%' AND name = 'ct0' LIMIT 1`,
      args: [],
    });

    await db.close();

    const authToken = authRows[0]?.encrypted_value
      ? Buffer.from(authRows[0].encrypted_value as string, 'latin1').toString('utf-8')
      : null;
    const ct0 = ct0Rows[0]?.encrypted_value
      ? Buffer.from(ct0Rows[0].encrypted_value as string, 'latin1').toString('utf-8')
      : null;

    return { authToken, ct0 };
  } catch {
    return { authToken: null, ct0: null };
  }
}

export async function detectAndExtract(
  chromeDir: string,
): Promise<ChromeProfileDetection> {
  const profiles = detectChromeProfiles(chromeDir);
  const selectedProfile = profiles[0] || '';

  if (!selectedProfile) {
    return { profiles: [], selectedProfile: '' };
  }

  const profilePath = path.join(chromeDir, selectedProfile);
  const { authToken, ct0 } = await extractTwitterCookies(profilePath);

  return {
    profiles,
    selectedProfile,
    authToken: authToken || undefined,
    ct0: ct0 || undefined,
  };
}
