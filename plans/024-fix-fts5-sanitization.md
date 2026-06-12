# Plan 024: Fix incomplete FTS5 query sanitization

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/db/article-content.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

The `sanitizeFtsQuery` function at `src/db/article-content.ts:113-118` only escapes `*`, `-`, and `"`. It does not escape FTS5 operators like `OR`, `AND`, `NOT`, `NEAR`, or parentheses `(`, `)`. A user searching for `(AI)` or `machine OR learning` will trigger an FTS5 syntax error, returning no results and potentially an unhandled error to the UI.

## Current state

- `src/db/article-content.ts:113-118`:
  ```typescript
  export function sanitizeFtsQuery(query: string): string {
    return query
      .replace(/[*]/g, '\\*')
      .replace(/[-]/g, '\\-')
      .replace(/["]/g, '""');
  }
  ```
- `src/db/article-content.ts:120-134` — `searchArticleContent` uses the sanitized query in `MATCH ?`
- FTS5 special characters: `*`, `-`, `"`, `(`, `)`, `:`, `^`, `~`, `OR`, `AND`, `NOT`, `NEAR`, `{`, `}`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test -- article-content` | all pass       |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/db/article-content.ts` — fix `sanitizeFtsQuery` to escape all FTS5 special characters
- `src/db/__tests__/article-content.test.ts` — add test cases for FTS5 sanitization

**Out of scope**:
- `src/renderer/components/SearchOverlay.tsx` — UI unchanged, just receives sanitized queries
- FTS5 index setup — already exists

## Git workflow

- Branch: `advisor/024-fix-fts5-sanitization`
- Commit: `fix(db): escape all FTS5 special characters in search queries`

## Steps

### Step 1: Fix sanitizeFtsQuery to escape all FTS5 operators

The simplest robust approach: wrap the entire query in double quotes for an exact phrase match, and escape any existing double quotes inside the query. This prevents FTS5 from interpreting any operators.

```typescript
export function sanitizeFtsQuery(query: string): string {
  // Escape existing double quotes, then wrap in quotes for exact phrase match
  const escaped = query.replace(/"/g, '""');
  return `"${escaped}"`;
}
```

Alternative approach: escape individual special chars. The double-quote approach is simpler and more robust.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add tests for FTS5 sanitization

In `src/db/__tests__/article-content.test.ts`, add tests:

```typescript
describe('sanitizeFtsQuery', () => {
  it('wraps query in double quotes', () => {
    expect(sanitizeFtsQuery('hello')).toBe('"hello"');
  });

  it('escapes existing double quotes', () => {
    expect(sanitizeFtsQuery('say "hello"')).toBe('"say ""hello"""');
  });

  it('handles parentheses without FTS5 error', () => {
    expect(sanitizeFtsQuery('(AI)')).toBe('"(AI)"');
  });

  it('handles OR/AND/NOT operators', () => {
    expect(sanitizeFtsQuery('machine OR learning')).toBe('"machine OR learning"');
  });
});
```

**Verify**: `pnpm test -- article-content` → all pass including new sanitization tests

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all pass

## Test plan

- New tests for `sanitizeFtsQuery` covering parentheses, OR/AND/NOT, double quotes, and regular queries
- Existing article content search tests should still pass (exact phrase matching is a stricter but valid behavior)
- Pattern to follow: `src/db/__tests__/article-content.test.ts`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; article-content tests include new sanitization tests
- [ ] `grep -n "sanitizeFtsQuery" src/db/article-content.ts` shows the updated function
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The double-quote wrapping approach breaks existing FTS5 searches (test with real data)
- `sanitizeFtsQuery` has been changed since commit `9eea449`

## Maintenance notes

- The double-quote approach makes searches exact-phrase only. If partial matching is desired later, switch to escaping individual characters and using `*` for prefix matching.
- The existing FTS5 index uses `snippet()` for result highlighting — exact phrase matching still works with snippets.
