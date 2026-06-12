# Plan 047: Cache getConfigEnv to avoid repeated disk reads

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/main/ipc/content.ts src/main/ipc/settings.ts src/main/ipc/pipeline.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

`getConfigEnv()` calls `readConfig(userDataDir)` which reads from disk. It's called by every handler that needs the API key: summarize-bookmark, extract-article, send-chat-message, enhance-note, generate-glossary. Each IPC call triggers a disk read for the same config file.

## Current state

- `src/main/ipc/content.ts` — IPC handlers, contains getConfigEnv
- `src/main/ipc/settings.ts` — settings IPC handlers (save-settings)
- `src/main/ipc/pipeline.ts` — pipeline IPC handlers, also calls getConfigEnv

**The repeated disk read (content.ts:18-22)**:
```typescript
async function getConfigEnv(userDataDir: string) {
  const config = await readConfig(userDataDir);
  return { apiKey: config.apiKey };
}
```

**Called from multiple handlers**: summarize-bookmark (line 31), extract-article (line 38), send-chat-message (line 57), enhance-note (line 127), generate-glossary (line 137).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/ipc/content.ts`
- `src/main/ipc/settings.ts`
- `src/main/ipc/pipeline.ts`

**Out of scope**:
- Services, UI components

## Steps

### Step 1: Add caching logic to getConfigEnv in content.ts

Add a module-level cache variable and modify `getConfigEnv` to return cached results if fresh (within 5 seconds). Export an `invalidateConfigCache()` function.

```typescript
let cachedConfig: { apiKey?: string; ts: number } | null = null;

async function getConfigEnv(userDataDir: string) {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.ts < 5000) {
    return { apiKey: cachedConfig.apiKey };
  }
  const config = await readConfig(userDataDir);
  cachedConfig = { apiKey: config.apiKey, ts: now };
  return { apiKey: config.apiKey };
}

export function invalidateConfigCache() {
  cachedConfig = null;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Call invalidateConfigCache from settings save handler

In `src/main/ipc/settings.ts`, find the save-settings handler and add a call to `invalidateConfigCache()` after the config is saved to disk.

**Verify**: `pnpm lint` → exit 0

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass
- No new tests required for this perf-only change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "invalidateConfigCache" src/main/ipc/settings.ts` returns a match
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file
- settings.ts does not have a save-settings handler
