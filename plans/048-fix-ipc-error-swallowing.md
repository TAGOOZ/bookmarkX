# Plan 048: Fix silent error swallowing in IPC handlers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/main/ipc/content.ts src/services/extract.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: reliability
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Several IPC handlers catch all errors and return null or empty arrays instead of propagating. This hides bugs from the user — the UI gets a silent "no data" response instead of an error message. The renderer already has `.catch()` handlers for IPC calls, so errors should propagate.

## Current state

- `src/main/ipc/content.ts` — IPC handlers
- `src/services/extract.ts` — extraction service

**Silent error swallowing in content.ts**:
- `create-chat-session` (line 62-68): catches all errors, logs `console.warn`, returns `null`
- `search-articles` (line 218-227): catches errors, logs `console.error`, returns `[]`

**Silent error swallowing in extract.ts**:
- `:68-70`: catches FK constraint errors silently
- `:115-117`: catches FK constraint errors silently

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/ipc/content.ts`
- `src/services/extract.ts`

**Out of scope**:
- Other IPC handlers that already propagate errors correctly (e.g., extract-article)

## Steps

### Step 1: Remove try/catch from create-chat-session handler

Remove the try/catch block at content.ts:62-68. Let the error propagate to the renderer's `.catch()` handler.

**Verify**: `pnpm lint` → exit 0

### Step 2: Remove try/catch from search-articles handler

Remove the try/catch block at content.ts:218-227. Let the error propagate to the renderer's `.catch()` handler.

**Verify**: `pnpm lint` → exit 0

### Step 3: Add logging to extract.ts catch blocks

Add `console.warn` before the `return` statements at extract.ts:68-70 and :115-117 so errors are at least logged.

**Verify**: `pnpm lint` → exit 0

### Step 4: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass
- No new tests required for this reliability change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "return null" src/main/ipc/content.ts` returns no matches
- [ ] `grep -n "return \[\]" src/main/ipc/content.ts` returns no matches
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file
