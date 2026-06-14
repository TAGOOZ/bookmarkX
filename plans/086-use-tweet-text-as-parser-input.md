# Plan 086: Use tweet_text as parser input for threads and plain tweets

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 63cfca2..HEAD -- src/parser/ src/services/extract.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM
- **Depends on**: 084
- **Category**: bug
- **Planned at**: commit `63cfca2`, 2026-06-14

## Why this matters

For threads and plain tweets, the parser fetches the tweet URL which returns a Twitter page with no extractable article content. The actual content is in `tweet_text`, which bird CLI already provides. The parser should use `tweet_text` directly instead of fetching the URL.

## Current state

`src/services/extract.ts:86-91`:
```ts
const result = await parseArticle(url, {
  apiKey: options.apiKey,
  model: options.model,
});
```

Always fetches `url`. For threads/plain tweets, `tweet_text` has the content.

`src/parser/local-parser.ts:25-68` — `parseURL` fetches and parses HTML.

## Scope

**In scope**:
- `src/parser/types.ts` — add `tweetText` to ParseOptions
- `src/parser/local-parser.ts` — add `parseTweetText` function
- `src/parser/index.ts` — route to `parseTweetText` when tweetText is provided
- `src/services/extract.ts` — pass tweet_text for threads/plain tweets

**Out of scope**:
- Thread expansion (multiple tweets)
- Video parsing

## Git workflow

- Branch: `advisor/086-use-tweet-text-as-parser-input`
- Commit: `fix(parser): use tweet_text directly for threads and plain tweets`

## Steps

### Step 1: Add tweetText to ParseOptions

In `src/parser/types.ts`:

```ts
export interface ParseOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  outerUrls?: string[];
  tweetText?: string;  // NEW: direct tweet text for threads/plain tweets
  contentType?: string;  // NEW: content type for routing
}
```

### Step 2: Add parseTweetText function

In `src/parser/local-parser.ts`, add a new exported function:

```ts
export function parseTweetText(text: string): ParserResult {
  // Split tweet text into paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const blocks: PartialBlock[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: trimmed, styles: {} }],
      } as any);
    }
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return { blocks, wordCount, readingTime };
}
```

### Step 3: Update parseArticle to route by content type

In `src/parser/index.ts`:

```ts
export async function parseArticle(
  url: string,
  options: ParseOptions = {},
): Promise<ParserResult> {
  // If tweet text is provided (thread or plain tweet), parse it directly
  if (options.tweetText) {
    const { parseTweetText } = await import('./local-parser');
    return parseTweetText(options.tweetText);
  }

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

  throw new Error(`Failed to parse any URL: ${urlsToTry.join(', ')}`);
}
```

### Step 4: Update extractArticle to pass tweet_text

In `src/services/extract.ts`, update the `extractArticle` call:

```ts
export async function extractArticle(
  db: Client,
  bookmarkId: string,
  url: string,
  options: ServiceOptions = {},
  outerUrls?: string[],
  tweetText?: string,
  contentType?: string,
): Promise<ExtractResult> {
  // ... cache check ...

  const result = await parseArticle(url, {
    apiKey: options.apiKey,
    model: options.model,
    outerUrls,
    tweetText: (contentType === 'thread' || contentType === 'plain_tweet') ? tweetText : undefined,
    contentType,
  });
```

### Step 5: Find callers and pass new parameters

Search for callers of `extractArticle` and update them to pass `bookmark.tweet_text` and `bookmark.content_type`.

### Step 6: Run verification

- `pnpm typecheck` — must pass
- `pnpm test` — must pass
- `pnpm lint` — must pass

### Step 7: Update README and commit

- Update `plans/README.md` row 086 to DONE
- Commit: `fix(parser): use tweet_text directly for threads and plain tweets`

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts.
- A step's verification fails twice after a reasonable fix attempt.
