# Plan 056: Remove duplicate unfetched/unclassified query

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/bookmarks.ts src/pipeline/classify-and-notify.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Category**: clean-code
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Two identical functions exist with the same SQL query: `getUnfetchedBookmarks` in `src/db/bookmarks.ts` and `getUnclassifiedBookmarks` in `src/pipeline/classify-and-notify.ts`. Both run `SELECT b.* FROM bookmarks b LEFT JOIN classifications c ON b.id = c.bookmark_id WHERE c.id IS NULL`. The name `getUnfetchedBookmarks` is also misleading — it finds bookmarks without classifications, not bookmarks that haven't been fetched. Having two copies means a fix to one won't apply to the other.

## Current state

- `src/db/bookmarks.ts:70-76` — `getUnfetchedBookmarks` (exported, misleading name)
- `src/pipeline/classify-and-notify.ts:13-18` — `getUnclassifiedBookmarks` (private, correct name)

**The duplicate SQL** (both files):
```sql
SELECT b.* FROM bookmarks b
LEFT JOIN classifications c ON b.id = c.bookmark_id
WHERE c.id IS NULL
```

**The naming issue**: `getUnfetchedBookmarks` suggests bookmarks where `fetched_at IS NULL`, but the query checks for missing classifications. The correct name is `getUnclassifiedBookmarks`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/bookmarks.ts`
- `src/pipeline/classify-and-notify.ts`

**Out of scope**:
- Other files that import `getUnfetchedBookmarks` (they'll be updated in step 2)

## Steps

### Step 1: Rename getUnfetchedBookmarks to getUnclassifiedBookmarks

In `src/db/bookmarks.ts`, rename the function from `getUnfetchedBookmarks` to `getUnclassifiedBookmarks`.

**Verify**: `pnpm typecheck` → will show errors for files still importing the old name

### Step 2: Update all imports of getUnfetchedBookmarks

Find all files that import `getUnfetchedBookmarks` and update them to import `getUnclassifiedBookmarks`:

```bash
grep -rn "getUnfetchedBookmarks" src/
```

Update each file's import statement.

**Verify**: `grep -rn "getUnfetchedBookmarks" src/` → no matches

### Step 3: Remove getUnclassifiedBookmarks from classify-and-notify.ts

Delete the `getUnclassifiedBookmarks` function from `src/pipeline/classify-and-notify.ts` (lines 13-18).

**Verify**: `grep -n "function getUnclassifiedBookmarks" src/pipeline/classify-and-notify.ts` → no matches

### Step 4: Import getUnclassifiedBookmarks from db module

In `src/pipeline/classify-and-notify.ts`, import `getUnclassifiedBookmarks` from `../db/bookmarks`:

```typescript
import { getUnclassifiedBookmarks } from '../db/bookmarks';
```

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0, all pass

## Test plan

- Existing tests should continue to pass
- No new tests needed — this is a rename + dedup with no behavior change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -rn "getUnfetchedBookmarks" src/` → no matches
- [ ] `grep -n "function getUnclassifiedBookmarks" src/pipeline/classify-and-notify.ts` → no matches
- [ ] `getUnclassifiedBookmarks` is exported from `src/db/bookmarks.ts`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The rename causes a type error (indicates the function signature changed)
