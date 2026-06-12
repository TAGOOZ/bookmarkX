# Plan 002: Fix FTS5 snippet highlighting destroyed by escapeHtml

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/renderer/components/SearchOverlay.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

Search result highlighting is completely broken. FTS5's `snippet()` function wraps matched terms in `<mark>` tags, but `escapeHtml()` on line 212 converts them to `&lt;mark&gt;`, rendering literal tag text instead of visual highlights.

## Current state

- `src/renderer/components/SearchOverlay.tsx` — the search overlay UI (227 lines)
- `src/db/article-content.ts:120-141` — `searchArticleContent` returns snippets with `<mark>` tags from FTS5

**The broken code (SearchOverlay.tsx:210-213)**:
```tsx
<div
  className="search-overlay-item-snippet"
  dangerouslySetInnerHTML={{ __html: escapeHtml(snippet) }}
/>
```

The `snippet` variable comes from `searchArticleContent()` which calls:
```typescript
snippet(article_content_fts, 0, '<mark>', '</mark>', '...', 32) as snippet
```

So `snippet` contains `<mark>matched term</mark>`. After `escapeHtml`, it becomes `&lt;mark&gt;matched term&lt;/mark&gt;`.

**The `escapeHtml` function** (SearchOverlay.tsx lines ~185-195):
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/components/SearchOverlay.tsx`

**Out of scope**:
- `src/db/article-content.ts` (the snippet generation is correct)
- Other components

## Steps

### Step 1: Replace `escapeHtml` with a mark-safe sanitizer

The snippet from FTS5 contains only `<mark>` tags as HTML. We need to escape everything EXCEPT `<mark>` and `</mark>`. Replace the `escapeHtml` function with a version that preserves `<mark>` tags:

```typescript
function escapeHtmlExceptMark(str: string): string {
  // Split on <mark> and </mark> tags, escape everything else
  const parts = str.split(/(<\/?mark>)/g);
  return parts
    .map((part) => {
      if (part === '<mark>' || part === '</mark>') return part;
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    })
    .join('');
}
```

Then change line 212 from:
```tsx
dangerouslySetInnerHTML={{ __html: escapeHtml(snippet) }}
```
to:
```tsx
dangerouslySetInnerHTML={{ __html: escapeHtmlExceptMark(snippet) }}
```

**Verify**: `pnpm lint` → exit 0

### Step 2: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- Manual verification: search for a term in the app and confirm `<mark>` tags render as yellow highlights, not literal text

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] The `escapeHtml` function is renamed/replaced with a version that preserves `<mark>` tags
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
