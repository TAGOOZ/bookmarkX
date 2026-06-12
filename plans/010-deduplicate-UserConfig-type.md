# Plan 010: Deduplicate UserConfig type into shared module

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/main/user-config.ts src/renderer/types.ts src/preload.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

`UserConfig` is defined identically in 3 files: `main/user-config.ts`, `renderer/types.ts`, and inline in `preload.ts`. Adding a field requires editing all 3 in lockstep.

## Current state

- `src/main/user-config.ts:4-16` — `UserConfig` interface
- `src/renderer/types.ts:35-47` — identical `UserConfig` interface
- `src/preload.ts:9-21` — inline type matching the same shape

All three define: `name`, `twitterHandle`, `geminiApiKey`, `birdAuthToken`, `birdCt0`, `birdChromeProfile`, `theme`, `language`, `notifications`, `fetchFrequency`, `aiModel`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/user-config.ts` (canonical source)
- `src/renderer/types.ts` (remove duplicate, import from shared)
- `src/preload.ts` (use shared type for the settings parameter)
- New file: `src/shared/types.ts` (shared UserConfig)

**Out of scope**:
- Other types
- Other renderer types

## Steps

### Step 1: Create src/shared/types.ts

Create a new file `src/shared/types.ts` that exports the canonical `UserConfig`:

```typescript
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
```

**Verify**: `ls src/shared/types.ts` → file exists

### Step 2: Update main/user-config.ts to import from shared

Replace the `UserConfig` interface definition (lines 4-16) with:

```typescript
import type { UserConfig } from '../shared/types';

export type { UserConfig };
```

Keep the `DEFAULT_CONFIG` and all functions unchanged.

**Verify**: `grep -n "interface UserConfig" src/main/user-config.ts` → no matches (it's now imported)

### Step 3: Update renderer/types.ts to import from shared

Replace the `UserConfig` interface definition (lines 35-47) with:

```typescript
import type { UserConfig } from '../../shared/types';
export type { UserConfig };
```

**Verify**: `grep -n "interface UserConfig" src/renderer/types.ts` → no matches

### Step 4: Update preload.ts to use the shared type

Replace the inline type in `saveSettings` (lines 9-21) with:

```typescript
import type { UserConfig } from './shared/types';

// ... in the contextBridge.exposeInMainWorld call:
saveSettings: (settings: UserConfig) => ipcRenderer.invoke('save-settings', settings),
```

**Verify**: `grep -c "name: string" src/preload.ts` → 0 (the inline fields are gone)

### Step 5: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- Single source of truth for UserConfig

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `src/shared/types.ts` exists and exports `UserConfig`
- [ ] No duplicate `interface UserConfig` definitions in main, renderer, or preload
- [ ] All three files import from `shared/types.ts`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Import paths cause resolution errors (check tsconfig baseUrl)
