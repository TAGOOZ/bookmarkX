# Plan 051: Standardize IPC error handling pattern

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/main/ipc/content.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: clean-code
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

`src/main/ipc/content.ts` has 18 IPC handlers with 5 different error patterns: throw, catch-and-return-null, catch-and-return-[], catch-log-rethrow, and structured success/cancelled returns. This inconsistency makes error behavior unpredictable. When a handler swallows an error and returns null or [], the renderer silently gets empty data instead of triggering error UI. Standardizing to one pattern (all handlers throw on error) ensures the renderer always knows when something went wrong.

## Current state

- `src/main/ipc/content.ts` — 18 IPC handlers (228 lines)
- `src/renderer/types.ts:46-139` — typed `window.api` methods that expect specific return types

**Inconsistent error patterns in content.ts**:

```typescript
// Pattern 1: Throw (summarize-bookmark line 26, send-chat-message line 54)
// These propagate to renderer correctly — keep as-is

// Pattern 2: Catch and return null (create-chat-session lines 62-68)
try {
  const session = await createChatSession(db, args.bookmarkId);
  return session;
} catch (err) {
  console.error('Failed to create chat session:', err);
  return null;
}

// Pattern 3: Catch and return [] (search-articles lines 218-227)
try {
  const results = await searchArticles(db, args.query);
  return results;
} catch (err) {
  console.error('Failed to search articles:', err);
  return [];
}

// Pattern 4: Catch, log, re-throw (extract-article lines 40-43)
try {
  // ... logic
} catch (err) {
  console.error('Failed to extract article:', err);
  throw err;
}

// Pattern 5: Structured returns (save-highlight line 79, save-note line 96)
return { success: true };

// Pattern 6: Cancelled return (export-bookmark line 202)
return { cancelled: true };
```

The renderer already wraps IPC calls in try/catch (e.g., `src/renderer/components/bookmark-detail/extensions/ChatBlock.tsx`). When a handler returns null instead of throwing, the renderer's error handler never fires and the UI shows stale/empty state.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/ipc/content.ts`

**Out of scope**:
- Other IPC files (`bookmarks.ts`, `topics.ts`, `hashtags.ts`)
- Renderer components (they already handle errors)
- Handlers that return `{ success: true }` or `{ cancelled: true }` — these are intentional structured responses, not error swallowing

## Steps

### Step 1: Audit each handler's error pattern

Read `src/main/ipc/content.ts` and list every handler with its current error pattern. Confirm the patterns match the "Current state" section above.

**Verify**: `grep -c "catch" src/main/ipc/content.ts` → should match the number of try/catch blocks noted above

### Step 2: Remove try/catch from create-chat-session

Remove the try/catch block around `createChatSession`. The handler will let the error propagate to the renderer.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Remove try/catch from search-articles

Remove the try/catch block around `searchArticles`. The handler will let the error propagate to the renderer.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Verify extract-article re-throws correctly

The `extract-article` handler (lines 40-43) catches, logs, and re-throws. This is acceptable — it adds logging before propagating. Confirm the re-throw is present and not swallowed.

**Verify**: `grep -A2 "catch" src/main/ipc/content.ts` → all catch blocks either re-throw or are removed

### Step 5: Document the standard pattern

Add a comment at the top of `src/main/ipc/content.ts`:
```typescript
// Error handling: All IPC handlers let errors propagate to the renderer.
// Do NOT add try/catch blocks that return null/[] — the renderer's error
// handlers need the exception to trigger error UI. Structured returns
// ({ success: true }, { cancelled: true }) are intentional, not error swallowing.
```

**Verify**: `pnpm lint` → exit 0

### Step 6: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0, all pass

## Test plan

- Existing tests should continue to pass
- No new tests needed — this plan removes error-swallowing code, not adds behavior

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] All handlers in content.ts either throw on error or return structured results (`{ success: true }`, `{ cancelled: true }`)
- [ ] No handler silently returns `null` or `[]` on error
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Removing a try/catch causes a type error (indicates the renderer depends on the null/[] return type)
