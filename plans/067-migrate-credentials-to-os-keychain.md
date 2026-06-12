# Plan 067: Migrate credentials to OS keychain

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/main/user-config.ts src/shared/types.ts src/main/ipc/settings.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Credentials (Gemini API key, Twitter auth_token, Twitter ct0) are stored as plaintext JSON in `~/.config/bookmarkX/user.json`. On shared or multi-user systems, these are readable by other processes. Electron provides `safeStorage` API that encrypts values using the OS keyring (GNOME Keyring on Linux, Keychain on macOS, Credential Manager on Windows). This plan migrates sensitive fields to safeStorage while keeping non-sensitive settings in the JSON file.

## Current state

- `src/main/user-config.ts:58-65` — `writeConfig` writes all settings (including credentials) as plaintext JSON
- `src/shared/types.ts` — `UserConfig` interface includes `geminiApiKey`, `birdAuthToken`, `birdCt0`
- `src/main/ipc/settings.ts` — save-settings handler calls `writeConfig`
- `src/main/ipc/content.ts:18-22` — `getConfigEnv` reads config for API key

Sensitive fields: `geminiApiKey`, `birdAuthToken`, `birdCt0`
Non-sensitive fields: `name`, `twitterHandle`, `birdChromeProfile`, `theme`, `language`, `notifications`, `fetchFrequency`, `aiModel`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/user-config.ts` — add keychain read/write functions
- `src/main/ipc/settings.ts` — update save-settings to use keychain for secrets
- `src/main/ipc/content.ts` — update getConfigEnv to read from keychain
- `src/shared/types.ts` — no changes needed (UserConfig stays the same)
- `package.json` — no new deps needed (Electron's safeStorage is built-in)

**Out of scope**:
- Renderer components (they never see raw credentials directly)
- Migration of existing plaintext credentials (handled in Step 2)
- Other IPC handlers

## Git workflow

- Branch: `advisor/067-keychain-credentials`
- Commit: `security: migrate credentials to OS keychain via safeStorage`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add keychain helper functions to user-config.ts

Add three functions using Electron's `safeStorage` API:

```typescript
import { safeStorage } from 'electron';

const SECRET_KEYS = ['geminiApiKey', 'birdAuthToken', 'birdCt0'] as const;

export async function readSecureConfig(userDataDir: string): Promise<Partial<UserConfig>> {
  const result: Partial<UserConfig> = {};
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
  // Remove old plaintext secrets from user.json if they exist
  const configPath = getConfigPath(userDataDir);
  if (!fs.existsSync(configPath)) return;
  const raw = await fs.promises.readFile(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  let changed = false;
  for (const key of SECRET_KEYS) {
    if (parsed[key]) { delete parsed[key]; changed = true; }
  }
  if (changed) {
    await fs.promises.writeFile(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
  }
}
```

**Verify**: `pnpm typecheck` exits 0

### Step 2: Update readConfig to merge secure values

Modify `readConfig` to call `readSecureConfig` and merge the decrypted values:

```typescript
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
  // Merge secrets from keychain
  const secrets = await readSecureConfig(userDataDir);
  configCache = { ...base, ...secrets };
  return configCache;
}
```

**Verify**: `pnpm typecheck` exits 0

### Step 3: Update writeConfig to store secrets in keychain

Modify `writeConfig` to extract sensitive fields and write them via `writeSecureConfig`:

```typescript
export async function writeConfig(userDataDir: string, config: UserConfig): Promise<void> {
  configCache = null;
  // Write secrets to keychain
  await writeSecureConfig(userDataDir, config);
  // Write non-secret config to JSON (strip secret fields)
  const safeConfig = { ...config };
  for (const key of SECRET_KEYS) { delete (safeConfig as any)[key]; }
  const configPath = getConfigPath(userDataDir);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) { await fs.promises.mkdir(dir, { recursive: true }); }
  await fs.promises.writeFile(configPath, JSON.stringify(safeConfig, null, 2), 'utf-8');
}
```

**Verify**: `pnpm typecheck` exits 0

### Step 4: Add one-time migration on app startup

In `src/main.ts`, after `initializeSchema`, call `removePlaintextSecrets` to clean up any existing plaintext credentials:

```typescript
import { removePlaintextSecrets } from './main/user-config';
// ... after schema init
await removePlaintextSecrets(app.getPath('userData'));
```

**Verify**: `pnpm typecheck` exits 0

### Step 5: Handle safeStorage availability

`safeStorage` may not be available in all Electron builds (e.g. headless CI). Add a fallback:

```typescript
function isSafeStorageAvailable(): boolean {
  try { return safeStorage.isEncryptionAvailable(); } catch { return false; }
}
```

If not available, fall back to plaintext with a console warning. This ensures the app still works in development/CI.

**Verify**: `pnpm typecheck` exits 0

### Step 6: Run full verification

Run `pnpm check`.

**Verify**: `pnpm check` exits 0

### Step 7: Manual verification

1. Start the app: `pnpm start:linux`
2. Open Settings, enter an API key, save
3. Check that `~/.config/bookmarkX/user.json` does NOT contain `geminiApiKey`
4. Check that `~/.config/bookmarkX/.secret-geminiApiKey` exists
5. Restart the app — settings should load correctly with the key

## Test plan

- Update existing user-config tests (`src/main/__tests__/user-config.test.ts`) to verify:
  - Secrets are not in the JSON file after writeConfig
  - readConfig returns secrets from keychain
- Add test for `removePlaintextSecrets` migration
- Mock `safeStorage` in tests (it won't be available in vitest/jsdom)

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `user.json` no longer contains `geminiApiKey`, `birdAuthToken`, or `birdCt0` after save
- [ ] `.secret-*` files exist in userData directory
- [ ] App loads settings correctly after restart
- [ ] `plans/README.md` status row updated

## STOP conditions

- `safeStorage` is not available in the Electron version being used
- The migration breaks existing user configurations
- A step's verification fails twice
- The fix requires modifying more than 5 files beyond the scope list
