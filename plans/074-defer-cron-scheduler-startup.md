# Plan 074: Defer cron scheduler startup to after window is visible

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

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e4bb75e`, 2026-06-13

## Why this matters

The cron scheduler is started during `app.whenReady()` before `createWindow()`. It imports `node-cron` and the pipeline modules (`fetch-and-store`, `classify-and-notify`) which are heavy. The scheduler's first run is 6 hours away — there's no reason to block startup for it.

## Current state

- `src/main.ts:115`: `import('./scheduler/cron')` is part of the `Promise.all` that blocks before `createWindow()`
- `src/main.ts:127-134`: `startCronScheduler(db, '0 */6 * * *')` is called in the startup sequence
- `src/scheduler/cron.ts:3-4`: imports `fetch-and-store` and `classify-and-notify` at module level

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
- `src/scheduler/cron.ts` — no changes needed
- Pipeline modules

## Git workflow

- Branch: `advisor/074-defer-cron-scheduler-startup`
- Commit: `perf(main): defer cron scheduler start to after window creation`

## Steps

### Step 1: Remove cron from the blocking Promise.all

In `src/main.ts`, remove `{ startCronScheduler }` from the `Promise.all` array (line 115) and the cron scheduling block (lines 127-134). Instead, start the cron scheduler after `createWindow()` using a dynamic import:

After `createWindow()`, add:

```typescript
  // Start cron scheduler in background (first run is 6 hours away)
  import('./scheduler/cron').then(({ startCronScheduler }) => {
    try {
      const cronJob = startCronScheduler(db, '0 */6 * * *');
      app.on('before-quit', () => {
        cronJob.stop();
      });
    } catch (err) {
      console.error('Failed to start cron scheduler:', err);
    }
  }).catch((err) => {
    console.error('Failed to import cron scheduler:', err);
  });
```

Remove the original cron import from the `Promise.all` and the cron scheduling block.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- No new tests needed — this is a sequencing change
- Existing cron tests in `src/scheduler/__tests__/cron.test.ts` import the module directly, not through main.ts

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "startCronScheduler" src/main.ts` shows it called after `createWindow()`
- [ ] `grep -n "scheduler/cron" src/main.ts` shows only dynamic import
- [ ] No files outside `src/main.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/main.ts` doesn't match the excerpts above
- A test fails after the change
- The cron scheduler fails to start because `db` is not yet initialized

## Maintenance notes

- The `db` variable must be initialized before the cron scheduler starts — since we move it after `createWindow()` which is after DB init, this is guaranteed
- The `before-quit` listener for cron stop is still registered correctly
- If the user triggers a manual fetch before the cron loads, it works fine — the IPC handler for fetch is registered in the blocking path (plan 073 keeps it in the deferred set, but the renderer's fetchBookmarks call goes through `get-bookmarks` which is critical)
