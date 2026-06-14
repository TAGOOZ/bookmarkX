# Plan 085: Store outer URLs and parse linked articles instead of tweet pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 63cfca2..HEAD -- src/services/extract.ts src/parser/index.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM
- **Depends on**: 084
- **Category**: bug
- **Planned at**: commit `63cfca2`, 2026-06-14

## Why this matters

When a tweet contains a link to a blog post, `raw.urls` from bird CLI contains the blog URL. But `mapBookmark` discards it, and `extractArticle` always parses the tweet URL — which is just a Twitter page with no article content. The parser should fetch the linked article instead.

## Current state

`src/services/extract.ts:62-91`:
```ts
export async function extractArticle(
  db: Client,
  bookmarkId: string,
  url: string,
  options: ServiceOptions = {},
): Promise<ExtractResult> {
  // ... cache check ...
  const result = await parseArticle(url, { ... });  // Always uses tweet URL
```

`src/parser/index.ts:3-20` — `parseArticle` takes a single URL string.

## Scope

**In scope**:
- `src/services/extract.ts` — pass outer_urls to parser when content_type is outer_link
- `src/parser/types.ts` — add `outerUrls` to ParseOptions
- `src/parser/index.ts` — accept and forward outerUrls

**Out of scope**:
- Parser branching logic (plan 087)
- Thread parsing (plan 086)

## Git workflow

- Branch: `advisor/085-parse-linked-articles-via-outer-urls`
- Commit: `fix(parser): fetch linked articles via outer_urls instead of tweet page`

## Steps

### Step 1: Add outerUrls to ParseOptions

In `src/parser/types.ts`:

```ts
export interface ParseOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  outerUrls?: string[];  // NEW: URLs to try before the tweet URL
}
```

### Step 2: Update extractArticle to pass outer_urls

In `src/services/extract.ts`, change the `parseArticle` call:

```ts
const result = await parseArticle(url, {
  apiKey: options.apiKey,
  model: options.model,
  outerUrls: options.outerUrls,  // NEW: pass through
});
```

Wait — `extractArticle` doesn't have access to `outer_urls`. It receives `url` as a parameter. I need to also pass the outer_urls from the bookmark.

Actually, looking at the call chain:
- `extractArticle(db, bookmarkId, url, options)` is called from somewhere
- It needs to know the outer_urls

Let me check who calls extractArticle. The caller must pass the bookmark's outer_urls.

Actually, the simpler approach: `extractArticle` should accept an optional `outerUrls` parameter. The caller (who has the bookmark) can pass `bookmark.outer_urls`.

Let me update the plan:

In `src/services/extract.ts`, add `outerUrls` to the function signature:

```ts
export async function extractArticle(
  db: Client,
  bookmarkId: string,
  url: string,
  options: ServiceOptions = {},
  outerUrls?: string[],
): Promise<ExtractResult> {
```

Then pass it through:

```ts
const result = await parseArticle(url, {
  apiKey: options.apiKey,
  model: options.model,
  outerUrls,
});
```

### Step 3: Update parseArticle to try outer URLs first

In `src/parser/index.ts`:

```ts
export async function parseArticle(
  url: string,
  options: ParseOptions = {},
): Promise<ParserResult> {
  // If outer URLs are provided, try them first
  const urlsToTry = options.outerUrls?.length
    ? [...options.outerUrls, url]
    : [url];

  for (const tryUrl of urlsToTry) {
    try {
      const { parseURL } = await import('./local-parser');
      return await parseURL(tryUrl, { timeoutMs: options.timeoutMs || 15000 });
    } catch (localError) {
      console.warn(`Local parser failed for ${tryUrl}:`, localError);
      // Only try Gemini for the last URL
      if (tryUrl === urlsToTry[urlsToTry.length - 1]) {
        const { parseWithGemini } = await import('./gemini-fallback');
        return await parseWithGemini(tryUrl, {
          apiKey: options.apiKey,
          model: options.model,
          timeoutMs: options.timeoutMs,
        });
      }
    }
  }

  // Should never reach here, but just in case
  throw new Error(`Failed to parse any URL: ${urlsToTry.join(', ')}`);
}
```

### Step 4: Find callers and pass outer_urls

Search for callers of `extractArticle` and update them to pass `bookmark.outer_urls`.

### Step 5: Run verification

- `pnpm typecheck` — must pass
- `pnpm test` — must pass
- `pnpm lint` — must pass

### Step 6: Update README and commit

- Update `plans/README.md` row 085 to DONE
- Commit: `fix(parser): fetch linked articles via outer_urls instead of tweet page`

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
