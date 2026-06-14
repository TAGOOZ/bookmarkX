# Plan 083: Fix plain tweet misclassification as outer_link

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 63cfca2..HEAD -- src/fetch/bird.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `63cfca2`, 2026-06-14

## Why this matters

Plain tweets (no thread, no video, no outer links) hit the final fallback in `classifyContentType` and are returned as `'outer_link'`. This causes the parser to fetch the tweet URL as if it were an article page, producing garbage content.

## Current state

`src/fetch/bird.ts:20-26`:
```ts
function classifyContentType(raw: any): Bookmark['content_type'] {
  if (raw.is_thread || raw.thread_tweet_count > 1) return 'thread';
  if (raw.is_video || raw.video) return 'video';
  if (raw.urls && raw.urls.length > 0) return 'outer_link';
  if (raw.is_article) return 'x_article';
  return 'outer_link';  // <-- BUG: plain tweets get outer_link
}
```

## Scope

**In scope**:
- `src/fetch/bird.ts` — add `'plain_tweet'` to classifyContentType and Bookmark type
- `src/fetch/types.ts` — add `'plain_tweet'` to content_type union
- `src/db/schema.ts` — update CHECK constraint to include `'plain_tweet'`
- `src/parser/__tests__/bird.test.ts` — add test for plain tweet classification

**Out of scope**:
- Parser changes (handled by plan 086)
- DB migration for new columns (handled by plan 084)

## Git workflow

- Branch: `advisor/083-fix-plain-tweet-misclassification`
- Commit: `fix(fetch): classify plain tweets as plain_tweet instead of outer_link`

## Steps

### Step 1: Add 'plain_tweet' to Bookmark type

In `src/fetch/types.ts`, change the `content_type` union:

```ts
content_type: 'outer_link' | 'thread' | 'x_article' | 'video' | 'plain_tweet';
```

### Step 2: Fix classifyContentType

In `src/fetch/bird.ts`, change the final return:

```ts
function classifyContentType(raw: any): Bookmark['content_type'] {
  if (raw.is_thread || raw.thread_tweet_count > 1) return 'thread';
  if (raw.is_video || raw.video) return 'video';
  if (raw.urls && raw.urls.length > 0) return 'outer_link';
  if (raw.is_article) return 'x_article';
  return 'plain_tweet';
}
```

### Step 3: Update DB CHECK constraint

In `src/db/schema.ts`, update the bookmarks table CHECK constraint (line 10):

```sql
content_type TEXT CHECK(content_type IN ('outer_link', 'thread', 'x_article', 'video', 'plain_tweet')),
```

### Step 4: Add migration for existing databases

In `src/db/schema.ts`, after the existing migrations, add:

```ts
// Migration: update content_type CHECK to include plain_tweet
// SQLite doesn't support ALTER CHECK, so we rely on the new schema.sql
// for fresh installs. Existing databases will work because SQLite
// doesn't enforce CHECK constraints on INSERT by default.
```

Note: SQLite doesn't support `ALTER TABLE ... ALTER CHECK`. The CHECK constraint is only enforced on new table creation. Existing databases will accept `'plain_tweet'` values without migration.

### Step 5: Add test

In `src/parser/__tests__/bird.test.ts` (or create if missing), add a test for plain tweet classification.

### Step 6: Run verification

- `pnpm typecheck` — must pass
- `pnpm test` — must pass
- `pnpm lint` — must pass

### Step 7: Update README and commit

- Update `plans/README.md` row 083 to DONE
- Commit: `fix(fetch): classify plain tweets as plain_tweet instead of outer_link`

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
