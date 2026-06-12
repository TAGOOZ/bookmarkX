# Plan 063: Add index on glossary_terms.term for LIKE queries

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/schema.ts src/db/glossary.ts`
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

`src/db/glossary.ts:39-42` uses `WHERE term LIKE ?` with a prefix pattern for search. Without an index on `glossary_terms.term`, every search query performs a full table scan. Prefix LIKE searches (`term LIKE 'prefix%'`) can use a B-tree index, making searches O(log n) instead of O(n).

## Current state

- `src/db/glossary.ts:39-42` — `searchTerms` uses `WHERE term LIKE ?` with a prefix pattern
- `src/db/schema.ts` — indexes block with `CREATE INDEX IF NOT EXISTS` statements

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

Add to the indexes block:

```sql
CREATE INDEX IF NOT EXISTS idx_glossary_terms_term ON glossary_terms(term);
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
- [ ] `grep -n "idx_glossary_terms_term" src/db/schema.ts` returns a match
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- When adding new tables with frequently queried text columns, consider adding indexes for LIKE queries
