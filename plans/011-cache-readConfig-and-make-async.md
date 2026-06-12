# Plan 011: Cache readConfig and replace sync readFileSync with async

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/main/user-config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/main/user-config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 010 (shared types)
- **Category**: perf
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

`readConfig` uses `fs.readFileSync` on every IPC call, blocking the Electron main process event loop. This causes UI jank on every fetch/classify/summarize request.

## Current state

- `src/main/user-config.ts` — config read/write (65 lines)

**The sync code (lines 42-56)**:
```typescript
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
```

Called from `getConfigEnv()` in `src/main/ipc/pipeline.ts` and `src/main/ipc/content.ts` on every IPC request.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/user-config.ts`

**Out of scope**:
- IPC handlers that call readConfig (they benefit from caching automatically)

## Steps

### Step 1: Add in-memory cache and make readConfig async

Replace the entire `readConfig` function with:

```typescript
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
```

### Step 2: Invalidate cache on writeConfig

Add cache invalidation at the start of `writeConfig`:

```typescript
export async function writeConfig(userDataDir: string, config: UserConfig): Promise<void> {
  configCache = null;  // <-- add this line
  const configPath = getConfigPath(userDataDir);
  // ... rest unchanged
```

### Step 3: Update callers to await readConfig

Check callers of `readConfig` in `src/main/ipc/` — they likely already use `await` since they're in async handlers. If any caller uses `readConfig` synchronously, update it.

**Verify**: `grep -rn "readConfig(" src/main/ipc/ | grep -v "await"` → no matches (all callers use await)

### Step 4: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- Config is read from disk once, then served from memory
- Write invalidates the cache

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `readConfig` is async and uses `fs.promises.readFile`
- [ ] `configCache` is invalidated in `writeConfig`
- [ ] All callers use `await readConfig(...)`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Callers of `readConfig` are not in async contexts
