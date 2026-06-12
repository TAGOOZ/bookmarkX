# Plan 062: Add missing index on chat_sessions.bookmark_id

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/schema.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

`src/db/schema.ts` defines `chat_sessions` with `bookmark_id TEXT REFERENCES bookmarks(id)` but no index. All other `bookmark_id` foreign keys have indexes (lines 258-270). While no current query exercises this FK lookup, the pattern implies it will be needed when chat sessions are queried by bookmark. Adding the index now prevents a future full table scan.

## Current state

- `src/db/schema.ts:107-111` — defines `chat_sessions` table with `bookmark_id TEXT REFERENCES bookmarks(id)`
- `src/db/schema.ts:258-270` — indexes block with `CREATE INDEX IF NOT EXISTS` statements for other `bookmark_id` FKs

Convention: all indexes in `src/db/schema.ts` use `CREATE INDEX IF NOT EXISTS` for idempotent creation.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/schema.ts` — add index creation

**Out of scope**:
- Other files

## Steps

### Step 1: Add the index creation to `src/db/schema.ts`

Add to the indexes block (after the existing `bookmark_id` indexes):

```sql
CREATE INDEX IF NOT EXISTS idx_chat_sessions_bookmark_id ON chat_sessions(bookmark_id);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass — index creation is idempotent and non-breaking
- No new tests required

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "idx_chat_sessions_bookmark_id" src/db/schema.ts` returns a match
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- When adding new tables with foreign keys, always add corresponding indexes in the same block
