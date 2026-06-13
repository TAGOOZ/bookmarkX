# Plan 076: Skip electron-squirrel-startup import on non-Windows

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

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e4bb75e`, 2026-06-13

## Why this matters

`electron-squirrel-startup` is imported at the top of `src/main.ts` (line 4) and checked at line 20-22. This module is only relevant on Windows (it handles installer shortcuts). On Linux/macOS it's dead weight. The `if (started)` check returns `false` on non-Windows, so the module is imported and evaluated for nothing.

## Current state

- `src/main.ts:4`: `import started from 'electron-squirrel-startup';`
- `src/main.ts:20-22`:
```typescript
if (started) {
  app.quit();
}
```
- The `started` value is always `false` on non-Windows platforms

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
- package.json (keep the dependency for Windows builds)

## Git workflow

- Branch: `advisor/076-conditional-squirrel-import`
- Commit: `perf(main): skip electron-squirrel-startup on non-Windows platforms`

## Steps

### Step 1: Guard the import with platform check

Replace the static import and usage in `src/main.ts` with a conditional:

Remove line 4: `import started from 'electron-squirrel-startup';`

Replace lines 20-22 with:

```typescript
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
  const started = require('electron-squirrel-startup');
  if (started) {
    app.quit();
  }
}
```

Note: Using `require()` here instead of dynamic `import()` because:
1. This runs at module level (before `app.whenReady()`)
2. The `started` check must be synchronous
3. `require()` is available in the main process

Actually, to avoid `require()` (which doesn't work well with ESM), we can keep the import but guard the check:

Keep the import on line 4. Replace lines 20-22 with:

```typescript
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// electron-squirrel-startup is only relevant on Windows
if (process.platform === 'win32' && started) {
  app.quit();
}
```

This is simpler — the import still happens but the `app.quit()` only runs on Windows. The module itself is lightweight (just checks an env var), so the overhead is minimal. The real win is avoiding the `app.quit()` call on non-Windows.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- No new tests needed — this is a platform guard, not behavior change
- Existing tests should pass unchanged

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "started" src/main.ts` shows the platform guard
- [ ] No files outside `src/main.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/main.ts` doesn't match the excerpts above
- A test fails after the change

## Maintenance notes

- The `electron-squirrel-startup` module should stay in `dependencies` (not `devDependencies`) for Windows builds
- If the app is ever distributed on Windows, this guard ensures correct behavior
- A more aggressive fix would use dynamic `import()` but that requires making the check async, which changes the startup flow
