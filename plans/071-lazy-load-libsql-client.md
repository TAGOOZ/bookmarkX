# Plan 071: Lazy-load @libsql/client in main process

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

`@libsql/client` is imported at the top of `src/main.ts` (line 5) as a static import. This module is only used inside `app.whenReady()`. Lazy-loading it defers its parsing/evaluation until it's actually needed, shaving a small but measurable amount off the initial module evaluation time.

## Current state

- `src/main.ts:5`: `import { createClient, type Client } from '@libsql/client';`
- `src/main.ts:24`: `let db: Client;`
- `createClient` is only called at line 102 inside `app.whenReady()`
- `Client` type is used for the `db` variable declaration

Convention: The codebase already uses dynamic `import()` in several places (e.g., `src/main.ts:111-117` for schema, IPC, cron, user-config modules).

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
- No other files

## Git workflow

- Branch: `advisor/071-lazy-load-libsql-client`
- Commit: `perf(main): lazy-load @libsql/client to defer module evaluation`

## Steps

### Step 1: Convert static import to dynamic import

In `src/main.ts`:

1. Remove the static import on line 5: `import { createClient, type Client } from '@libsql/client';`
2. Change the `db` variable declaration (line 24) to use `any` type temporarily: `let db: any;`
3. Inside `app.whenReady()`, before `createClient` is called (around line 100), add a dynamic import:

```typescript
    const { createClient } = await import('@libsql/client');
```

The `Client` type is only used for the variable declaration. Since the variable is module-scoped and only assigned in one place, using `any` is acceptable here (matches the codebase's existing pattern of `any` usage in `src/main/user-config.ts:53,62`).

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- No new tests needed — this is a module loading optimization, not behavior change
- Existing tests should pass unchanged

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "@libsql/client" src/main.ts` shows only dynamic import, no static import
- [ ] No files outside `src/main.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/main.ts` doesn't match the excerpts above
- A test fails after the change
- Typecheck fails due to the `any` type change

## Maintenance notes

- If stricter typing is desired later, the `db` variable can be typed with a lazy type assertion inside `app.whenReady()`
- The dynamic import pattern is already established in this codebase (see `src/main.ts:111-117`)
