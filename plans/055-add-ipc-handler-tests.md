# Plan 055: Add IPC handler unit tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/main/ipc/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Category**: test-coverage
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Zero tests exist for any IPC handler in `src/main/ipc/*.ts`. The IPC layer is the boundary between main and renderer processes — regressions here are invisible until manual testing. Adding unit tests for the 5 most critical handlers catches regressions in chat creation, article search, glossary management, custom sections, and bookmark summarization.

## Current state

- `src/main/ipc/content.ts` — 18 IPC handlers, zero tests
- `src/main/ipc/bookmarks.ts` — IPC handlers, zero tests
- `src/db/__tests__/*.test.ts` — existing test patterns (mock db client)
- `src/services/__tests__/*.test.ts` — existing test patterns (mock external APIs)
- `src/pipeline/__tests__/*.test.ts` — existing test patterns (mock dependencies)

**The IPC registration pattern** (from content.ts):
```typescript
export function registerContentIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('summarize-bookmark', async (_event, args) => {
    const { summarizeBookmark } = await import('../services/summarize');
    const env = await getConfigEnv();
    return summarizeBookmark(db, args, { apiKey: env.apiKey });
  });
  // ... more handlers
}
```

**Testing approach**: Import `registerContentIpc`, call it with a mock `ipcMain` that captures registered handlers, then invoke each handler directly with mock arguments.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/ipc/__tests__/` (new directory)
- `src/main/ipc/__tests__/content.test.ts`

**Out of scope**:
- Other test files
- IPC registration in `index.ts`
- Tests for bookmarks.ts, topics.ts, hashtags.ts (follow-up)

## Steps

### Step 1: Create test directory and file

Create `src/main/ipc/__tests__/content.test.ts`.

**Verify**: `ls src/main/ipc/__tests__/` → content.test.ts exists

### Step 2: Set up test infrastructure

Create a mock `ipcMain` that captures registered handlers:

```typescript
import { registerContentIpc } from '../content';

function createMockIpcMain() {
  const handlers: Record<string, Function> = {};
  return {
    handle: (channel: string, handler: Function) => {
      handlers[channel] = handler;
    },
    handlers,
  };
}
```

Mock the db client and `getConfigEnv`.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Write tests for 5 key handlers

Write tests for:
1. `summarize-bookmark` — happy path, error propagation
2. `create-chat-session` — happy path, db error
3. `search-articles` — happy path, empty results
4. `add-glossary-term` — happy path, duplicate handling
5. `create-custom-section` — happy path, validation

Each test: register handlers, call the handler function directly, assert return value or thrown error.

**Verify**: `pnpm test -- content.test.ts` → all pass

### Step 4: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0, all pass

## Test plan

- New file: `src/main/ipc/__tests__/content.test.ts`
- 10+ tests covering 5 handlers (happy path + error case each)
- Pattern: mock ipcMain, mock db, call handler directly

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] At least 10 IPC handler tests exist and pass
- [ ] Tests cover error propagation (handler throws when db fails)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The IPC registration pattern has changed (indicates the test approach needs redesign)
- Mocking the db client proves too complex (indicates tight coupling that needs refactoring first)
