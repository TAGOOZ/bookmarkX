# Plan 050: Remove dead code and unused types

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/client.ts src/renderer/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: clean-code
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Dead code increases cognitive load and maintenance burden. Removing unused files and types keeps the codebase clean and makes it easier for contributors to find relevant code.

## Current state

- `src/db/client.ts` — contains only a comment: `// Database client is created inline in main.ts`. Never imported.
- `src/renderer/types.ts` — contains unused interfaces

**Unused types (renderer/types.ts:15-33)**:
```typescript
export interface BookmarkData {
  id: string;
  url: string;
  title: string;
  content?: string;
  createdAt: string;
}

export interface ClassificationData {
  priority: string;
  readingTimeMin: number;
  topic?: string;
  hashtags: string[];
}
```

Neither `BookmarkData` nor `ClassificationData` is imported anywhere in the codebase.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/client.ts`
- `src/renderer/types.ts`

**Out of scope**:
- Other files

## Steps

### Step 1: Delete src/db/client.ts

Delete the file entirely.

**Verify**: `ls src/db/client.ts` → file not found

### Step 2: Remove BookmarkData interface from types.ts

Remove the `BookmarkData` interface (lines 15-25 approximately) from `src/renderer/types.ts`.

**Verify**: `pnpm lint` → exit 0

### Step 3: Remove ClassificationData interface from types.ts

Remove the `ClassificationData` interface (lines 27-33 approximately) from `src/renderer/types.ts`.

**Verify**: `pnpm lint` → exit 0

### Step 4: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass
- No new tests required for dead code removal

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `src/db/client.ts` does not exist
- [ ] `grep -n "BookmarkData" src/renderer/types.ts` returns no matches
- [ ] `grep -n "ClassificationData" src/renderer/types.ts` returns no matches
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file
- BookmarkData or ClassificationData is actually imported somewhere (STOP and verify)
