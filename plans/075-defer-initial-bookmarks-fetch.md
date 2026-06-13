# Plan 075: Defer initial bookmarks fetch to after first paint

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e4bb75e..HEAD -- src/renderer/App.tsx src/renderer/stores/bookmarkStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e4bb75e`, 2026-06-13

## Why this matters

When the renderer mounts, `AppContent` immediately calls `fetchBookmarks()` in a `useEffect` (line 82-84). This triggers two IPC calls (`getBookmarks` + `getClassifications`) which each hit the SQLite database. These queries block the first paint — the user sees a blank screen while bookmarks are fetched. Deferring this by ~100ms using `requestIdleCallback` or a short timeout lets the UI render first, then populate data.

## Current state

- `src/renderer/App.tsx:82-84`:
```typescript
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);
```
- `src/renderer/stores/bookmarkStore.ts:119-162`: `fetchBookmarks` calls `window.api.getBookmarks()` and `window.api.getClassifications()` via `Promise.all`, then maps results
- The `NavPanel` and `SplitLayout` both depend on `bookmarks` from the store — they render empty on first paint

Convention: The codebase uses `useEffect` for side effects. No existing use of `requestIdleCallback`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/renderer/App.tsx`

**Out of scope**:
- `src/renderer/stores/bookmarkStore.ts` — no changes needed
- Other renderer components

## Git workflow

- Branch: `advisor/075-defer-initial-bookmarks-fetch`
- Commit: `perf(renderer): defer initial bookmarks fetch to after first paint`

## Steps

### Step 1: Defer fetchBookmarks with requestIdleCallback

In `src/renderer/App.tsx`, wrap the `fetchBookmarks()` call in `requestIdleCallback` (with a `setTimeout` fallback for environments without it):

Replace lines 82-84 with:

```typescript
  useEffect(() => {
    const scheduleFetch = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: false } as IdleDeadline), 0));
    const handle = scheduleFetch(() => {
      fetchBookmarks();
    });
    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as unknown as number);
      }
    };
  }, [fetchBookmarks]);
```

This defers the fetch until the browser is idle (after first paint), with a `setTimeout(0)` fallback. The cleanup function prevents fetching on unmount.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing renderer tests should pass — they mock `window.api` and don't depend on fetch timing
- If tests fail because `requestIdleCallback` is not in the test environment (jsdom), add a mock:
  ```typescript
  // In test setup or test file
  window.requestIdleCallback = (cb) => setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: false } as IdleDeadline), 0) as unknown as number;
  window.cancelIdleCallback = (id) => clearTimeout(id);
  ```

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "fetchBookmarks" src/renderer/App.tsx` shows it inside `requestIdleCallback` or `setTimeout`
- [ ] No files outside `src/renderer/App.tsx` are modified (unless test setup needs updating)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/renderer/App.tsx` doesn't match the excerpts above
- Tests fail and the fix requires major changes to test infrastructure
- The deferred fetch causes a visible flicker or layout shift

## Maintenance notes

- `requestIdleCallback` is available in Chromium/Electron but not in all browsers — the `setTimeout` fallback handles this
- The 0ms timeout still defers to the next microtask, which is enough for first paint
- If more aggressive deferral is wanted, the timeout can be increased to 50-100ms
- The cleanup function is important to prevent memory leaks on fast navigation
