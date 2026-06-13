# Plan 069: Remove .env file deletion on every startup

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e4bb75e..HEAD -- src/main.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e4bb75e`, 2026-06-13

## Why this matters

On every startup, `main.ts` lines 90-96 attempt to `fs.promises.access()` then `fs.promises.unlink()` a `.env` file from the app path. This runs two async filesystem operations before the window is created. The `.env` file is a build artifact that shouldn't exist in production — if it does, it's a one-time cleanup, not a per-startup task. The comment says "Delete .env on first launch after update" but it runs every launch.

## Current state

- `src/main.ts:89-96`:
```typescript
  // Delete .env on first launch after update
  const envPath = path.join(app.getAppPath(), '.env');
  try {
    await fs.promises.access(envPath);
    await fs.promises.unlink(envPath);
  } catch {
    // .env doesn't exist — nothing to delete
  }
```

This runs inside `app.whenReady().then(async () => { ... })` before `initializeSchema` and before `createWindow`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/main.ts`

**Out of scope**:
- Build configuration, .gitignore

## Git workflow

- Branch: `advisor/069-remove-startup-env-deletion`
- Commit: `perf(main): remove per-startup .env file deletion`

## Steps

### Step 1: Remove the .env deletion block

In `src/main.ts`, remove lines 89-96 (the entire `// Delete .env on first launch after update` block including the envPath const, try/catch, and comment).

The resulting code at that location should go directly from `const userDataDir = app.getPath('userData');` to the `// Initialize SQLite database with error handling` comment.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- No new tests needed — this is removing dead code
- Existing tests should pass unchanged

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -rn "\.env" src/main.ts` returns no matches for the deletion logic
- [ ] No files outside `src/main.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/main.ts` doesn't match the excerpts above
- A test fails after the change

## Maintenance notes

- The `.env` file should be in `.gitignore` already — verify this is the case
- If a one-time migration is ever needed, it should be done via the schema migration system (plan 068), not per-startup fs operations
