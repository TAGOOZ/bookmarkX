# Plan 057: Replace `rows as any[]` with typed row interfaces in DB layer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: clean-code
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Every DB query result is cast to `any[]` before mapping, producing 100+ `as any` occurrences across `src/db/*.ts`. This eliminates all type safety at the DB boundary — the compiler cannot catch wrong field names, missing fields, or incorrect types. A `mapRow<T>` helper with typed row interfaces gives compile-time guarantees that every query result maps correctly to its domain type.

## Current state

- `src/db/bookmarks.ts` — bookmark CRUD; `(rows as any[]).map` at line 30
- `src/db/classifications.ts` — classification CRUD; `rows[0] as any` at lines 45, 55, 87
- `src/db/hashtags.ts` — hashtag CRUD; `rows as any[]` at lines 29, 39, 46, 96, 115
- `src/db/topics.ts` — topic CRUD; `rows[0] as any` at lines 37, 51, 115, 131
- `src/db/glossary.ts` — glossary CRUD; `rows[0] as any` at lines 31, 44, 75, 89
- `src/db/chat.ts` — chat sessions; `rows[0] as any` at line 39
- `src/db/summaries.ts` — summaries; `rows[0] as any` at line 37
- `src/db/highlights.ts` — highlights; `rows[0] as any` at line 37
- `src/db/notes.ts` — notes; `rows[0] as any` at line 37
- `src/db/import-jobs.ts` — import jobs; `rows[0] as any` at lines 38, 62, 102
- `src/db/custom-sections.ts` — custom sections; `rows[0] as any` at lines 24, 41
- `src/db/article-content.ts` — article content; `rows[0] as any` at lines 59, 94

The libSQL client returns `Row[]` which has `.columnNames` and allows indexed access but doesn't provide type safety. The existing code casts every result to `any[]` to suppress type errors.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/row-types.ts` (new)
- `src/db/bookmarks.ts`
- `src/db/classifications.ts`
- `src/db/hashtags.ts`
- `src/db/topics.ts`
- `src/db/glossary.ts`
- `src/db/chat.ts`
- `src/db/summaries.ts`
- `src/db/highlights.ts`
- `src/db/notes.ts`
- `src/db/import-jobs.ts`
- `src/db/custom-sections.ts`
- `src/db/article-content.ts`
- `src/db/notifications.ts`

**Out of scope**:
- `src/pipeline/` — pipeline functions receive already-mapped types
- `src/services/` — service layer
- `src/renderer/` — renderer code
- Any changes to the domain types themselves (`Bookmark`, `Classification`, etc.)

## Steps

### Step 1: Create `src/db/row-types.ts` with all row interfaces

Create a new file with interfaces matching the SQLite column names for every table. Each interface uses snake_case field names matching the DB columns, with `| null` for nullable columns.

```typescript
import type { Row } from '@libsql/client';

export interface BookmarkRow {
  id: string; tweet_id: string; url: string; content_type: string;
  title: string | null; title_ar: string | null; title_en: string | null;
  author_name: string | null; author_handle: string | null;
  tweet_text: string | null; topic_id: string | null;
  fetched_at: string | null; created_at: string;
}

export interface ClassificationRow {
  id: string; bookmark_id: string; topic_id: string;
  confidence: number; summary: string; created_at: string;
}

export interface TopicRow {
  id: string; name: string; name_ar: string | null;
  description: string | null; parent_id: string | null;
  created_at: string;
}

export interface HashtagRow {
  id: string; name: string; created_at: string;
}

export interface BookmarkHashtagRow {
  bookmark_id: string; hashtag_id: string;
}

// ... similar for GlossaryTermRow, ChatSessionRow, ChatMessageRow,
// SummaryRow, HighlightRow, NoteRow, ImportJobRow,
// CustomSectionRow, ArticleContentRow, NotificationRow, UserConfigRow

export function mapRow<T>(row: Row, fields: (keyof T)[]): T {
  const result = {} as T;
  for (const field of fields) {
    (result as Record<string, unknown>)[field as string] = row[field as string];
  }
  return result;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Update `src/db/bookmarks.ts`

Replace all `as any` casts with `mapRow<BookmarkRow>()` or typed alternatives. The `mapRow` helper extracts values by column name from the libSQL `Row`.

For `rows as any[]` patterns: replace with `(rows as Row[]).map(row => mapRow<BookmarkRow>(row, [...fields]))`.

For `rows[0] as any` patterns: replace with `rows[0] ? mapRow<BookmarkRow>(rows[0], [...fields]) : undefined`.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Update `src/db/classifications.ts`

Replace all `as any` casts with typed alternatives using `ClassificationRow`.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Update `src/db/hashtags.ts`

Replace all `as any` casts with typed alternatives using `HashtagRow` and `BookmarkHashtagRow`.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Update `src/db/topics.ts`

Replace all `as any` casts with typed alternatives using `TopicRow`.

**Verify**: `pnpm typecheck` → exit 0

### Step 6: Update remaining DB files

Update all remaining files: `glossary.ts`, `chat.ts`, `summaries.ts`, `highlights.ts`, `notes.ts`, `import-jobs.ts`, `custom-sections.ts`, `article-content.ts`, `notifications.ts`.

Replace each `as any` with the corresponding row type.

**Verify**: `pnpm typecheck` → exit 0

### Step 7: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass — no behavior change
- No new tests required — this is a type-safety improvement, not a behavior change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -r "as any" src/db/` returns 0 matches (excluding `row-types.ts` and `__tests__/`)
- [ ] `src/db/row-types.ts` exists with all row interfaces
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- A required row type cannot be determined from the existing code
- The fix appears to require changing domain types (out of scope)

## Maintenance notes

- When adding new DB tables, add the corresponding row interface to `row-types.ts`
- The `mapRow` helper should be the standard way to convert `Row` to typed objects — avoid bare `as any` in new code
