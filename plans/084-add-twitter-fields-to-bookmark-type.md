# Plan 084: Add Twitter-specific fields to Bookmark type and DB schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 63cfca2..HEAD -- src/fetch/types.ts src/fetch/bird.ts src/db/schema.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 083
- **Category**: feature
- **Planned at**: commit `63cfca2`, 2026-06-14

## Why this matters

The parser needs to know which URLs are outer links (for fetching articles) and which tweets are threads (for parsing tweet text). This data is available from bird CLI but discarded in `mapBookmark`. Adding these fields to the Bookmark type enables content-type-aware parsing.

## Current state

`src/fetch/types.ts` — Bookmark has no `outer_urls`, `thread_tweet_count`, or `video_url`.
`src/fetch/bird.ts:28-42` — `mapBookmark` discards `raw.urls`, `raw.thread_tweet_count`, `raw.video`.

## Scope

**In scope**:
- `src/fetch/types.ts` — add `outer_urls`, `thread_tweet_count`, `video_url` to Bookmark
- `src/fetch/bird.ts` — populate new fields in `mapBookmark`
- `src/db/schema.ts` — add columns + migration

**Out of scope**:
- Parser changes (plans 085, 086)
- UI changes

## Git workflow

- Branch: `advisor/084-add-twitter-fields-to-bookmark-type`
- Commit: `feat(fetch): add outer_urls, thread_tweet_count, and video_url to Bookmark`

## Steps

### Step 1: Add fields to Bookmark type

In `src/fetch/types.ts`:

```ts
export interface Bookmark {
  id: string;
  tweet_id: string;
  url: string;
  content_type: 'outer_link' | 'thread' | 'x_article' | 'video' | 'plain_tweet';
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  author_name: string | null;
  author_handle: string | null;
  tweet_text: string | null;
  outer_urls: string[] | null;        // NEW: URLs found in tweet
  thread_tweet_count: number | null;   // NEW: number of tweets in thread
  video_url: string | null;            // NEW: video download URL
  fetched_at: string;
}
```

### Step 2: Populate new fields in mapBookmark

In `src/fetch/bird.ts`, update `mapBookmark`:

```ts
function mapBookmark(raw: any): Bookmark {
  return {
    id: raw.id || crypto.randomUUID(),
    tweet_id: raw.id,
    url: raw.url || `https://x.com/i/status/${raw.id}`,
    content_type: classifyContentType(raw),
    title: raw.title || null,
    title_ar: raw.title_ar || null,
    title_en: raw.title_en || null,
    author_name: raw.author?.name || null,
    author_handle: raw.author?.screen_name || null,
    tweet_text: raw.text || null,
    outer_urls: raw.urls || null,
    thread_tweet_count: raw.thread_tweet_count || null,
    video_url: raw.video || null,
    fetched_at: new Date().toISOString(),
  };
}
```

### Step 3: Add columns to schema

In `src/db/schema.ts`, add to the bookmarks table definition:

```sql
outer_urls TEXT,  -- JSON array stored as text
thread_tweet_count INTEGER,
video_url TEXT,
```

### Step 4: Add migration for existing databases

In `src/db/schema.ts`, after the existing migrations:

```ts
// Migration: add Twitter-specific fields to bookmarks
try {
  await db.execute({ sql: 'ALTER TABLE bookmarks ADD COLUMN outer_urls TEXT', args: [] });
} catch { /* Column already exists */ }
try {
  await db.execute({ sql: 'ALTER TABLE bookmarks ADD COLUMN thread_tweet_count INTEGER', args: [] });
} catch { /* Column already exists */ }
try {
  await db.execute({ sql: 'ALTER TABLE bookmarks ADD COLUMN video_url TEXT', args: [] });
} catch { /* Column already exists */ }
```

### Step 5: Run verification

- `pnpm typecheck` — must pass
- `pnpm test` — must pass
- `pnpm lint` — must pass

### Step 6: Update README and commit

- Update `plans/README.md` row 084 to DONE
- Commit: `feat(fetch): add outer_urls, thread_tweet_count, and video_url to Bookmark`

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
