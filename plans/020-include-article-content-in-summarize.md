# Plan 020: Include article content in summarize prompt for substantive summaries

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/services/summarize.ts src/main/ipc/content.ts src/db/article-content.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug (summary quality)
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

The `buildSummarizePrompt` function at `src/services/summarize.ts:6-21` only includes the bookmark's title, tweet text, and URL in the prompt. It never fetches or includes the extracted article content from the `article_content` table. This means summaries are generated from ~140 characters of tweet metadata rather than the full article — producing shallow, potentially inaccurate summaries. The PRD says summaries should be substantive ("English + Egyptian Arabic side by side"), implying article-level content.

## Current state

- `src/services/summarize.ts:6-21` — `buildSummarizePrompt(title, tweetText, url)` only uses metadata
- `src/services/summarize.ts:24-57` — `summarizeBookmark(db, bookmarkId, bookmark, options)` receives the bookmark object but never queries `article_content`
- `src/main/ipc/content.ts:25-33` — the IPC handler fetches the bookmark but not its article content
- `src/db/article-content.ts` — `getArticleContent(db, bookmarkId)` exists and returns `{ extracted_text, blocks_json, ... }`
- `src/services/types.ts` — `ServiceOptions` type already exists

The codebase convention for service functions: typed I/O, service-layer abstraction, DB as source of truth (per ADR-0013). See `src/services/chat.ts` for an exemplar that accepts `articleContext` as a parameter.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test -- summarize` | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/services/summarize.ts` — modify `summarizeBookmark` to fetch article content and include it in the prompt
- `src/services/summarize.test.ts` — update tests to cover the new behavior

**Out of scope**:
- `src/main/ipc/content.ts` — no changes needed; `summarizeBookmark` already receives `db` and can fetch article content itself
- `src/db/article-content.ts` — the `getArticleContent` function already exists
- `src/services/chat.ts` — already handles `articleContext` correctly

## Git workflow

- Branch: `advisor/020-summarize-article-content`
- Commit: `feat(summarize): include extracted article content in summarize prompt`

## Steps

### Step 1: Fetch article content in summarizeBookmark

In `src/services/summarize.ts`, after fetching the bookmark (line 29 area), also fetch article content:

```typescript
import { getArticleContent } from '../db/article-content';

// Inside summarizeBookmark, after getting the bookmark:
const articleContent = await getArticleContent(db, bookmarkId);
```

**Verify**: `pnpm typecheck` → exit 0 (getArticleContent is now imported)

### Step 2: Update buildSummarizePrompt to accept optional article content

Change the function signature and prompt to include article text when available:

```typescript
function buildSummarizePrompt(
  title: string | null,
  tweetText: string | null,
  url: string,
  articleText?: string,
): string {
  const parts = [];
  if (title) parts.push(`Title: ${title}`);
  if (tweetText) parts.push(`Tweet: ${tweetText}`);
  parts.push(`URL: ${url}`);
  if (articleText) {
    // Truncate to ~8000 chars to stay within token limits
    const truncated = articleText.length > 8000
      ? articleText.substring(0, 8000) + '\n\n[Content truncated...]'
      : articleText;
    parts.push(`\nFull article content:\n${truncated}`);
  }
  // ... rest of prompt unchanged
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Pass article content from summarizeBookmark to buildSummarizePrompt

In `summarizeBookmark`, after fetching `articleContent`, pass its `extracted_text` to the prompt builder:

```typescript
const prompt = buildSummarizePrompt(
  bookmark.title,
  bookmark.tweet_text,
  bookmark.url,
  articleContent?.extracted_text,
);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Update tests

Update `src/services/summarize.test.ts` to mock `getArticleContent` and verify it's called. Add a test case where article content is present and included in the prompt. Follow the existing test pattern (see the test file for mock conventions).

**Verify**: `pnpm test -- summarize` → all tests pass including new ones

### Step 5: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all pass

## Test plan

- Existing summarize tests should continue to pass (article content is optional — null/undefined falls back to metadata-only behavior)
- New test: when article content exists, verify `callGemini` receives a prompt containing the article text
- New test: when article content is null, verify prompt falls back to metadata-only (current behavior preserved)
- Pattern to follow: `src/services/__tests__/summarize.test.ts`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; summarize tests include new article content test
- [ ] `grep -n "articleContent" src/services/summarize.ts` shows the new parameter
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `getArticleContent` has changed since commit `9eea449`
- The summarize prompt structure has changed significantly
- Article content causes Gemini to timeout on very long articles (test with 8000+ char content)

## Maintenance notes

- The 8000-char truncation is a starting point. Monitor Gemini token usage — if summaries improve with more content, consider increasing. If tokens are a concern, consider summarizing the article first with a cheap pass, then summarizing the summary.
- If Defuddle extraction is not yet available (plan 019 not landed), `articleContent` will be null and the function falls back to metadata-only. This is the correct degraded behavior.
