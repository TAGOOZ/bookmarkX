# Plan 070: Defer removePlaintextSecrets to after window creation

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

`removePlaintextSecrets()` runs on every startup before `createWindow()`. It reads `user.json`, parses it, checks for plaintext secret keys, and potentially rewrites the file. This is a one-time migration task (migrate old plaintext secrets to OS keychain) that blocks the window from appearing. Moving it after `createWindow()` lets the user see the app immediately while cleanup happens in the background.

## Current state

- `src/main.ts:120`: `await removePlaintextSecrets(userDataDir);` — runs before `createWindow()` on line 141
- `src/main/user-config.ts:74-87`: reads user.json, parses, checks for SECRET_KEYS, writes back if changed
- This is idempotent — safe to run anytime, not just before window creation

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
- `src/main/user-config.ts` — no changes needed

## Git workflow

- Branch: `advisor/070-defer-removePlaintextSecrets`
- Commit: `perf(main): defer removePlaintextSecrets to after window creation`

## Steps

### Step 1: Move removePlaintextSecrets after createWindow

In `src/main.ts`, move the `await removePlaintextSecrets(userDataDir);` call from its current position (line 120, before IPC registration) to after `createWindow()` (line 141). Make it non-blocking (fire-and-forget) since it's a background cleanup:

```typescript
  // Create window first for faster perceived startup
  createWindow();

  // Background cleanup: remove plaintext secrets from config (one-time migration)
  removePlaintextSecrets(userDataDir).catch((err) => {
    console.error('Failed to remove plaintext secrets:', err);
  });
```

Remove the original `await removePlaintextSecrets(userDataDir);` line and its surrounding context.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- No new tests needed — this is a sequencing change, not behavior change
- Existing tests should pass unchanged

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "removePlaintextSecrets" src/main.ts` shows it called after `createWindow()`
- [ ] No files outside `src/main.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/main.ts` doesn't match the excerpts above
- A test fails after the change

## Maintenance notes

- `removePlaintextSecrets` is idempotent — it's safe to run at any point
- The `.catch()` ensures startup doesn't fail if this cleanup fails
- After all users have migrated (a few releases), this entire function can be removed
