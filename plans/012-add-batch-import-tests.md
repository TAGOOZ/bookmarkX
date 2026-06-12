# Plan 012: Add tests for batch import pipeline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/pipeline/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: plan 001 (bugs fixed first)
- **Category**: tests
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

`batch-import.ts` is 308 lines with pagination, retry logic, pause/resume, abort handling, and classification batching — completely untested. This is the most complex pipeline module.

## Current state

- `src/pipeline/batch-import.ts` — 308 lines, no test file
- `src/pipeline/__tests__/` — contains `classify-and-notify.test.ts` and `fetch-and-store.test.ts` (existing test patterns to follow)

The module exports: `startBatchImport`, `pauseImport`, `getImportStatus`, `getActiveImport`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |
| Test watch| `pnpm test:watch`        | runs tests          |

## Scope

**In scope**:
- New file: `src/pipeline/__tests__/batch-import.test.ts`

**Out of scope**:
- `src/pipeline/batch-import.ts` (already fixed in plan 001)
- Other test files

## Steps

### Step 1: Study existing test patterns

Read `src/pipeline/__tests__/classify-and-notify.test.ts` to understand the mocking patterns:
- How `db` is mocked (in-memory SQLite via `createTestDb()` or mock object)
- How external services are mocked (`vi.mock`)
- How IPC handlers are tested

### Step 2: Create test file

Create `src/pipeline/__tests__/batch-import.test.ts` with these test cases:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../db/bookmarks', () => ({
  storeBookmarks: vi.fn(),
}));
vi.mock('../../db/classifications', () => ({
  getClassification: vi.fn(),
  storeClassification: vi.fn(),
}));
vi.mock('../../fetch/bird', () => ({
  fetchBookmarksPaginated: vi.fn(),
}));
vi.mock('../../classify/classifier', () => ({
  classifyBookmark: vi.fn(),
}));
vi.mock('../../notify/notify', () => ({
  createNotification: vi.fn(),
}));

import { startBatchImport, pauseImport, getImportStatus, getActiveImport } from '../batch-import';
```

Test cases:
1. **Normal flow**: startBatchImport completes successfully, stores bookmarks and classifications
2. **Pause**: startBatchImport then pauseImport stops the import
3. **Empty fetch**: completes immediately when no bookmarks returned
4. **Concurrent guard**: calling startBatchImport while one is running throws
5. **getImportStatus**: returns correct status for a completed job
6. **getActiveImport**: returns null when no import is running

### Step 3: Run tests

**Verify**: `pnpm test -- batch-import` → all tests pass

### Step 4: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- 6 test cases covering the main flows
- Mock all external dependencies (bird, classifier, DB writes)
- Follow existing test patterns from `classify-and-notify.test.ts`

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `src/pipeline/__tests__/batch-import.test.ts` exists
- [ ] At least 6 test cases pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Mocking patterns from existing tests don't work for this module
