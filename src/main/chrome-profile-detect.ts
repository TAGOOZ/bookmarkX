import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export interface ChromeProfileDetection {
  profiles: string[];
  selectedProfile: string;
  authToken?: string;
  ct0?: string;
  warning?: string;
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

function decryptV10(encryptedValue: Buffer): string | null {
  // v10 cookies are encrypted with a key from the Linux keyring
  // Try to get the key via secret-tool
  try {
    const key = execFileSync('secret-tool', [
      'lookup',
      'application', 'chrome',
      'xdg:schema', 'chrome_libsecret_os_crypt_password_v2',
    ], { timeout: 3000, encoding: 'utf-8' }).trim();

    if (!key) return null;

    // The encrypted value is: v10[12-byte IV][ciphertext]
    // We need to decrypt using AES-128-CBC with PKCS7 padding
    // This is complex - fall back to letting bird handle it
    return null;
  } catch {
    return null;
  }
}

export async function extractTwitterCookies(
  profilePath: string,
): Promise<{ authToken: string | null; ct0: string | null; encrypted?: boolean }> {
  const cookiesDbPath = path.join(profilePath, 'Cookies');
  if (!fs.existsSync(cookiesDbPath)) {
    return { authToken: null, ct0: null };
  }

  function extractValue(row: any): { value: string | null; encrypted: boolean } {
    if (!row?.encrypted_value) return { value: null, encrypted: false };
    const buf = Buffer.from(row.encrypted_value as string, 'latin1');
    const raw = buf.toString('utf-8');

    // Check for encryption prefixes
    if (raw.startsWith('v10') || raw.startsWith('v11')) {
      return { value: null, encrypted: true };
    }

    return { value: raw, encrypted: false };
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

    const auth = extractValue(authRows[0]);
    const ct0 = extractValue(ct0Rows[0]);

    return {
      authToken: auth.value,
      ct0: ct0.value,
      encrypted: auth.encrypted || ct0.encrypted,
    };
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
  const { authToken, ct0, encrypted } = await extractTwitterCookies(profilePath);

  let warning: string | undefined;
  if (encrypted) {
    warning = 'Chrome cookies are encrypted on this system. Use "Login with Twitter" or enter tokens manually in Settings.';
  } else if (!authToken || !ct0) {
    warning = 'No X cookies found in Chrome. Make sure you are logged into x.com in Chrome.';
  }

  return {
    profiles,
    selectedProfile,
    authToken: authToken || undefined,
    ct0: ct0 || undefined,
    warning,
  };
}
