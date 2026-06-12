# Plan 045: Batch glossary term inserts in generate-glossary IPC

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/glossary.ts src/main/ipc/content.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

The generate-glossary IPC handler loops over terms calling `addTerm` then `linkTermToBookmark` individually. For 15 terms, that's 30 sequential INSERTs. Batching them reduces DB round-trips significantly for large glossaries.

## Current state

- `src/main/ipc/content.ts` — IPC handlers for content operations
- `src/db/glossary.ts` — glossary DB functions

**The sequential loop (content.ts:139-142)**:
```typescript
for (const t of result.terms) {
  const termId = await addTerm(db, t.term, t.definition);
  await linkTermToBookmark(db, bookmarkId, termId);
}
```

**The DB functions (glossary.ts)**:
```typescript
// addTerm (~line 15-25): INSERT INTO glossary_terms, returns term ID
// linkTermToBookmark (~line 27-33): INSERT INTO bookmark_glossary
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/glossary.ts`
- `src/main/ipc/content.ts`

**Out of scope**:
- UI components
- Other IPC handlers

## Steps

### Step 1: Add batchAddTermsAndLink function to glossary.ts

Add a new exported function `batchAddTermsAndLink(db, bookmarkId, terms)` that:
1. Generates UUIDs for all terms upfront
2. Builds an array of INSERT statements for glossary_terms
3. Builds an array of INSERT statements for bookmark_glossary
4. Uses `db.batch()` to execute all inserts in a single transaction
5. Returns the created term IDs

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Update generate-glossary IPC handler

Replace the loop at content.ts:139-142 with a single call to `batchAddTermsAndLink(db, bookmarkId, result.terms)`.

**Verify**: `pnpm lint` → exit 0

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing glossary tests should continue to pass
- No new tests required for this perf-only change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "addTerm\|linkTermToBookmark" src/main/ipc/content.ts` returns no matches (loop removed)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file
