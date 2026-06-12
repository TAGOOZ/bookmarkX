# Plan 023: Replace weak HTML sanitizer with DOMPurify in ArticleReaderBlock

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/renderer/components/bookmark-detail/extensions/ArticleReaderBlock.tsx src/renderer/components/SearchOverlay.tsx package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

`ArticleReaderBlock.tsx:9-13` uses `sanitizeTableHtml` which only escapes `&` and `"` inside HTML tags via regex. It does not strip event handlers (`onerror`, `onload`), `javascript:` URIs, or dangerous attributes. The sanitized HTML is rendered via `dangerouslySetInnerHTML` at line 98. Since article content comes from arbitrary external URLs, a malicious page could embed event handlers in table cells, enabling stored XSS in the Electron renderer context (which has access to `window.api`).

## Current state

- `src/renderer/components/bookmark-detail/extensions/ArticleReaderBlock.tsx:9-13`:
  ```typescript
  function sanitizeTableHtml(html: string): string {
    return html.replace(/<([^>]+)>/g, (match, tag) => {
      return '<' + tag.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '>';
    }).replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, '&amp;');
  }
  ```
- Line 98: `dangerouslySetInnerHTML={{ __html: html }}` renders the sanitized HTML
- Content originates from `src/parser/local-parser.ts:241-246` which uses `$.html(el)` on parsed third-party HTML

The same pattern applies to `SearchOverlay.tsx:5-18,218` where `escapeHtmlExceptMark` renders FTS5 snippets via `dangerouslySetInnerHTML`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm add dompurify @types/dompurify` | exit 0 |
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `package.json` — add dompurify and @types/dompurify
- `src/renderer/components/bookmark-detail/extensions/ArticleReaderBlock.tsx` — replace `sanitizeTableHtml` with DOMPurify
- `src/renderer/components/SearchOverlay.tsx` — replace `escapeHtmlExceptMark` with DOMPurify
- `src/renderer/components/bookmark-detail/extensions/__tests__/ArticleReaderBlock.test.ts` (create if missing) — add sanitization tests

**Out of scope**:
- `src/parser/local-parser.ts` — content extraction stays unchanged
- Other components using `dangerouslySetInnerHTML` — audit those separately

## Git workflow

- Branch: `advisor/023-dompurify-sanitizer`
- Commit: `fix(security): sanitize article HTML with DOMPurify to prevent stored XSS`

## Steps

### Step 1: Install DOMPurify

```bash
pnpm add dompurify @types/dompurify
```

**Verify**: `pnpm add dompurify @types/dompurify` → exit 0; `grep dompurify package.json` → shows both deps

### Step 2: Replace sanitizeTableHtml in ArticleReaderBlock

In `src/renderer/components/bookmark-detail/extensions/ArticleReaderBlock.tsx`:

1. Add import: `import DOMPurify from 'dompurify';`
2. Replace the `sanitizeTableHtml` function body:

```typescript
function sanitizeTableHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption', 'colgroup', 'col', 'div', 'span', 'p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'figure', 'figcaption'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'scope', 'class', 'target', 'rel', 'width', 'height', 'loading'],
    ALLOW_DATA_ATTR: false,
  });
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Replace escapeHtmlExceptMark in SearchOverlay

In `src/renderer/components/SearchOverlay.tsx`:

1. Add import: `import DOMPurify from 'dompurify';`
2. Replace the `escapeHtmlExceptMark` function:

```typescript
function sanitizeSnippet(str: string): string {
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: [],
  });
}
```

3. Update the usage at line 218:
```typescript
dangerouslySetInnerHTML={{ __html: sanitizeSnippet(snippet) }}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Add sanitization tests

Create or update `src/renderer/components/bookmark-detail/extensions/__tests__/ArticleReaderBlock.test.ts`:

- Test that `sanitizeTableHtml` strips `onerror` event handler from `<img onerror="alert(1)">`
- Test that `sanitizeTableHtml` strips `javascript:` URIs
- Test that `sanitizeTableHtml` preserves safe table HTML
- Test that `sanitizeSnippet` strips all tags except `<mark>`

**Verify**: `pnpm test` → all pass including new sanitization tests

### Step 5: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all pass

## Test plan

- New test: `sanitizeTableHtml('<table><tr><td onerror="alert(1)">test</td></tr></table>')` → `onerror` attribute stripped
- New test: `sanitizeTableHtml('<a href="javascript:alert(1)">link</a>')` → `href` stripped or sanitized
- New test: `sanitizeTableHtml('<table><tr><td>safe</td></tr></table>')` → preserved as-is
- New test: `sanitizeSnippet('<mark>term</mark><script>alert(1)</script>')` → `<script>` stripped, `<mark>` preserved
- Pattern: create a test file or add to existing `ArticleReaderBlock.test.ts`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; sanitization tests exist and pass
- [ ] `grep -n "sanitizeTableHtml" src/renderer/components/bookmark-detail/extensions/ArticleReaderBlock.tsx` shows DOMPurify usage
- [ ] `grep -n "DOMPurify" src/renderer/components/SearchOverlay.tsx` shows the import
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- DOMPurify cannot be imported in the Electron renderer context (check if it requires `window` global)
- The ALLOWED_TAGS list misses a tag that existing article content uses (check `src/parser/__tests__/` for example HTML)
- Tests fail after the change

## Maintenance notes

- DOMPurify is the industry standard for HTML sanitization (used by Wikipedia, GitHub, etc.). It's actively maintained and handles edge cases that regex-based sanitizers miss.
- The `ALLOWED_TAGS` list may need expansion as new article content types are encountered. Monitor console warnings from DOMPurify about stripped tags.
- If the app needs to support custom HTML in article content in the future, review the allowlist.
