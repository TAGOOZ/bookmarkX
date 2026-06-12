# Plan 005: Add missing indexes on foreign key columns

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/db/schema.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

No indexes exist on any foreign key columns used in JOINs and WHERE clauses. Every `getClassification`, `getHighlights`, `getNotes`, `getBookmarksByTopic`, and hashtag query performs a full table scan. As data grows, these degrade linearly.

## Current state

- `src/db/schema.ts` — database schema and migrations (334 lines)

The schema defines tables with foreign keys but no indexes:
- `classifications.bookmark_id` — used in `getClassification` WHERE clause
- `bookmarks.topic_id` — used in topic JOINs
- `bookmark_hashtags.bookmark_id` — used in hashtag queries
- `bookmark_hashtags.hashtag_id` — used in hashtag queries
- `summaries.bookmark_id` — used in summary lookups
- `notes.bookmark_id` — used in note lookups
- `highlights.bookmark_id` — used in highlight lookups
- `chat_messages.session_id` — used in chat queries
- `custom_sections.bookmark_id` — used in custom section lookups
- `article_content.bookmark_id` — used in article content lookups

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/schema.ts`

**Out of scope**:
- Individual DB modules (they benefit from indexes without changes)

## Steps

### Step 1: Add index creation statements to initializeSchema

After the `executeMultiple(SCHEMA_SQL)` call (line 156), add a new block of `CREATE INDEX IF NOT EXISTS` statements. Place them after the FTS migration block (after line 256) and before the title_ar/title_en migration:

```typescript
  // Indexes on foreign key columns for query performance
  await db.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_classifications_bookmark_id ON classifications(bookmark_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_topic_id ON bookmarks(topic_id);
    CREATE INDEX IF NOT EXISTS idx_bookmark_hashtags_bookmark_id ON bookmark_hashtags(bookmark_id);
    CREATE INDEX IF NOT EXISTS idx_bookmark_hashtags_hashtag_id ON bookmark_hashtags(hashtag_id);
    CREATE INDEX IF NOT EXISTS idx_summaries_bookmark_id ON summaries(bookmark_id);
    CREATE INDEX IF NOT EXISTS idx_notes_bookmark_id ON notes(bookmark_id);
    CREATE INDEX IF NOT EXISTS idx_highlights_bookmark_id ON highlights(bookmark_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_custom_sections_bookmark_id ON custom_sections(bookmark_id);
    CREATE INDEX IF NOT EXISTS idx_article_content_bookmark_id ON article_content(bookmark_id);
  `);
```

**Verify**: `grep -c "CREATE INDEX" src/db/schema.ts` → 10

### Step 2: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- Indexes are additive — no behavior change, only performance improvement

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] 10 `CREATE INDEX IF NOT EXISTS` statements exist in `schema.ts`
- [ ] All foreign key columns used in JOINs/WHERE have corresponding indexes
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
