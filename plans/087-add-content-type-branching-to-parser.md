# Plan 087: Add content_type branching to parser orchestrator

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 63cfca2..HEAD -- src/parser/index.ts src/services/extract.ts`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM
- **Depends on**: 084, 085, 086
- **Category**: refactor
- **Planned at**: commit `63cfca2`, 2026-06-14

## Why this matters

The parser orchestrator should have a clean entry point that routes by content type. Currently `parseArticle` is a generic function that doesn't know about content types. This plan creates a `parseBookmark` function that takes a full Bookmark and routes to the correct parsing strategy.

## Current state

`src/parser/index.ts` — `parseArticle(url, options)` takes URL + options.
`src/services/extract.ts` — manually constructs options and calls `parseArticle`.

## Scope

**In scope**:
- `src/parser/index.ts` — add `parseBookmark` function
- `src/services/extract.ts` — replace manual option construction with `parseBookmark`

**Out of scope**:
- UI changes
- Changes to individual parsing functions (already done in 085, 086)

## Git workflow

- Branch: `advisor/087-add-content-type-branching-to-parser`
- Commit: `refactor(parser): add parseBookmark with content-type-aware routing`

## Steps

### Step 1: Add parseBookmark to parser/index.ts

```ts
import type { Bookmark } from '../fetch/types';

export async function parseBookmark(
  bookmark: Bookmark,
  options: ParseOptions = {},
): Promise<ParserResult> {
  const { content_type, tweet_text, outer_urls, url } = bookmark;

  switch (content_type) {
    case 'plain_tweet':
    case 'thread': {
      if (tweet_text) {
        const { parseTweetText } = await import('./local-parser');
        return parseTweetText(tweet_text);
      }
      // Fallback: try parsing the tweet URL
      return parseArticle(url, options);
    }

    case 'outer_link': {
      // Try outer URLs first, then fall back to tweet URL
      return parseArticle(url, {
        ...options,
        outerUrls: outer_urls || undefined,
      });
    }

    case 'x_article':
    case 'video':
    default: {
      return parseArticle(url, options);
    }
  }
}
```

### Step 2: Simplify extractArticle to use parseBookmark

In `src/services/extract.ts`:

```ts
export async function extractArticle(
  db: Client,
  bookmarkId: string,
  url: string,
  options: ServiceOptions = {},
  bookmark?: Bookmark,  // NEW: optional full bookmark for content-type routing
): Promise<ExtractResult> {
  // ... cache check ...

  const { parseBookmark } = await import('../parser');

  const result = bookmark
    ? await parseBookmark(bookmark, {
        apiKey: options.apiKey,
        model: options.model,
      })
    : await parseArticle(url, {
        apiKey: options.apiKey,
        model: options.model,
      });
```

### Step 3: Update callers to pass bookmark

Search for callers of `extractArticle` and update them to pass the full bookmark object when available.

### Step 4: Run verification

- `pnpm typecheck` — must pass
- `pnpm test` — must pass
- `pnpm lint` — must pass

### Step 5: Update README and commit

- Update `plans/README.md` row 087 to DONE
- Commit: `refactor(parser): add parseBookmark with content-type-aware routing`

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
