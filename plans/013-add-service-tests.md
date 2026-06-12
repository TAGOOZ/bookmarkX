# Plan 013: Add tests for AI services (summarize, extract, enhance, chat)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/services/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

The core AI functionality (summarize, extract, enhance, chat) has zero test coverage. Only `gemini.test.ts` and `glossary.test.ts` exist. Prompt formatting bugs, response parsing failures, and error handling issues go undetected.

## Current state

- `src/services/summarize.ts` — 58 lines, no tests
- `src/services/extract.ts` — 124 lines, no tests
- `src/services/enhance.ts` — 46 lines, no tests
- `src/services/chat.ts` — 52 lines, no tests
- `src/services/__tests__/gemini.test.ts` — existing test pattern to follow

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- New file: `src/services/__tests__/summarize.test.ts`
- New file: `src/services/__tests__/extract.test.ts`
- New file: `src/services/__tests__/enhance.test.ts`
- New file: `src/services/__tests__/chat.test.ts`

**Out of scope**:
- `src/services/gemini.ts` (already tested)
- `src/services/glossary.ts` (already tested)

## Steps

### Step 1: Read existing test patterns

Read `src/services/__tests__/gemini.test.ts` to understand:
- How `callGemini` is mocked
- How the DB is mocked
- Test structure and assertions

### Step 2: Create summarize.test.ts

Mock `callGemini` and DB. Test cases:
1. Returns dual-language summary when API succeeds
2. Handles API error gracefully
3. Stores summary in DB after successful generation

### Step 3: Create extract.test.ts

Mock `callGemini` and DB. Test cases:
1. Extracts article content successfully
2. Returns null when extraction fails
3. Handles missing article content

### Step 4: Create enhance.test.ts

Mock `callGemini`. Test cases:
1. Returns enhanced text
2. Handles API error gracefully

### Step 5: Create chat.test.ts

Mock `callGemini` and DB. Test cases:
1. Sends message and returns response
2. Creates new session when none exists
3. Stores messages in DB

### Step 6: Run all tests

**Verify**: `pnpm test -- services` → all tests pass
**Verify**: `pnpm lint && pnpm test` → exit 0

## Test plan

- 4 new test files, ~3-5 tests each
- Mock `callGemini` to return canned responses
- Mock DB operations to verify storage calls
- Follow `gemini.test.ts` patterns

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] 4 new test files exist under `src/services/__tests__/`
- [ ] At least 12 new tests pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Mocking patterns from gemini.test.ts don't work for these modules
