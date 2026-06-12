# Plan 046: Limit chat history sent to Gemini API

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/chat.ts src/services/chat.ts`
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

`getChatMessages` fetches all messages from a chat session with no LIMIT. For long sessions (50+ messages), the entire history is re-sent to Gemini every time, wasting tokens and increasing latency. Limiting to the most recent messages keeps costs and latency bounded.

## Current state

- `src/db/chat.ts` — chat message DB functions
- `src/services/chat.ts` — chat service that builds the prompt

**The unlimited query (chat.ts:67-69)**:
```typescript
const { rows } = await db.execute({
  sql: 'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
  args: [sessionId],
});
```

**The caller (chat.ts:46 in services)**:
```typescript
const messages = await getChatMessages(db, sessionId);
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/chat.ts`
- `src/services/chat.ts`

**Out of scope**:
- UI components
- IPC handlers

## Steps

### Step 1: Add getRecentChatMessages to chat.ts

Add a new exported function `getRecentChatMessages(db, sessionId, limit)` that runs the same SELECT but adds `LIMIT ?` with the provided limit parameter. Keep the original `getChatMessages` unchanged for the UI.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Update services/chat.ts to use the limited version

Replace the `getChatMessages(db, sessionId)` call at line 46 with `getRecentChatMessages(db, sessionId, 20)`.

**Verify**: `pnpm lint` → exit 0

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing chat tests should continue to pass
- No new tests required for this perf-only change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "getChatMessages" src/services/chat.ts` returns no matches (uses limited version instead)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file
