# Plan 026: Add selected_text column to chat_messages table

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/db/schema.ts src/db/chat.ts src/services/chat.ts src/main/ipc/content.ts src/preload.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (PRD schema drift)
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

The PRD schema at `docs/PRD.md:609` defines `chat_messages.selected_text TEXT` — a field designed to store which text the user selected when asking a chat question. The actual schema at `src/db/schema.ts:113-119` omits this column. Without it, the "select text → ask about it" workflow loses context about what the user selected, degrading the chat experience. The PRD explicitly specifies this field.

## Current state

- `docs/PRD.md:609` — PRD schema: `selected_text TEXT` on `chat_messages`
- `src/db/schema.ts:113-119` — actual schema has no `selected_text` column:
  ```sql
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES chat_sessions(id),
    role TEXT CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- `src/db/chat.ts:9-15` — `ChatMessage` interface has no `selected_text` field
- `src/db/chat.ts:48-59` — `addChatMessage` doesn't accept or store `selected_text`
- `src/services/chat.ts:29-51` — `sendMessage` doesn't pass `selected_text`
- `src/main/ipc/content.ts:51` — `send-chat-message` handler doesn't accept `selected_text`
- `src/preload.ts` — `sendChatMessage` bridge doesn't include `selected_text`

Repo conventions: schema migrations via try/catch ALTER TABLE in `schema.ts` (see lines 158-340 for the pattern). Service-layer abstraction with typed I/O (ADR-0013).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test -- chat`      | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/db/schema.ts` — add migration for `selected_text` column
- `src/db/chat.ts` — update `ChatMessage` interface and `addChatMessage` to accept optional `selected_text`
- `src/services/chat.ts` — pass `selected_text` through
- `src/main/ipc/content.ts` — accept `selected_text` in IPC handler
- `src/preload.ts` — update `sendChatMessage` type signature
- `src/db/__tests__/chat.test.ts` — add test for `selected_text`

**Out of scope**:
- UI changes to chat components — the column is nullable, so existing UI works without changes
- The "select text → ask about it" feature itself — this plan only adds the schema + plumbing

## Git workflow

- Branch: `advisor/026-chat-selected-text`
- Commit: `feat(db): add selected_text column to chat_messages for context-aware chat`

## Steps

### Step 1: Add migration in schema.ts

In `src/db/schema.ts`, after the existing chat_messages CREATE TABLE block, add:

```typescript
try {
  await db.execute('ALTER TABLE chat_messages ADD COLUMN selected_text TEXT');
} catch {
  // Column already exists
}
```

Follow the existing migration pattern (see lines 158-340 for examples).

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Update ChatMessage interface

In `src/db/chat.ts`, add `selected_text` to the `ChatMessage` interface:

```typescript
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  selected_text?: string | null;
  created_at: string;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Update addChatMessage to accept selected_text

In `src/db/chat.ts`, modify `addChatMessage`:

```typescript
export async function addChatMessage(
  db: Client,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  selectedText?: string,
): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO chat_messages (id, session_id, role, content, selected_text) VALUES (?, ?, ?, ?, ?)',
    args: [id, sessionId, role, content, selectedText || null],
  });
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Update getChatMessages to read selected_text

In `src/db/chat.ts`, update the mapping in `getChatMessages`:

```typescript
return (rows as any[]).map((row) => ({
  id: row.id,
  session_id: row.session_id,
  role: row.role,
  content: row.content,
  selected_text: row.selected_text || null,
  created_at: row.created_at,
}));
```

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Update sendMessage to pass selected_text

In `src/services/chat.ts`, add optional `selectedText` parameter to `sendMessage`:

```typescript
export async function sendMessage(
  db: Client,
  sessionId: string,
  message: string,
  articleContext?: string,
  options: ServiceOptions = {},
  selectedText?: string,
): Promise<ChatResult> {
  // ... existing code ...
  await addChatMessage(db, sessionId, 'user', message, selectedText);
  // ... rest unchanged ...
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 6: Update IPC handler

In `src/main/ipc/content.ts`, update the `send-chat-message` handler:

```typescript
ipcMain.handle('send-chat-message', async (_event, sessionId: string, message: string, articleContext?: string, selectedText?: string) => {
  // ... existing validation ...
  return sendMessage(db, sessionId, message, articleContext, { apiKey: env.apiKey }, selectedText);
});
```

**Verify**: `pnpm typecheck` → exit 0

### Step 7: Update preload bridge

In `src/preload.ts`, find the `sendChatMessage` type and add `selectedText`:

```typescript
sendChatMessage: (sessionId: string, message: string, articleContext?: string, selectedText?: string) =>
  ipcRenderer.invoke('send-chat-message', sessionId, message, articleContext, selectedText),
```

**Verify**: `pnpm typecheck` → exit 0

### Step 8: Add tests

In `src/db/__tests__/chat.test.ts`, add a test:

```typescript
it('stores and retrieves selected_text', async () => {
  const sessionId = await createChatSession(db, 'bookmark-1');
  await addChatMessage(db, sessionId, 'user', 'What is this?', 'selected text here');
  const messages = await getChatMessages(db, sessionId);
  expect(messages[0].selected_text).toBe('selected text here');
});

it('handles null selected_text', async () => {
  const sessionId = await createChatSession(db, 'bookmark-1');
  await addChatMessage(db, sessionId, 'user', 'Hello');
  const messages = await getChatMessages(db, sessionId);
  expect(messages[0].selected_text).toBeNull();
});
```

**Verify**: `pnpm test -- chat` → all tests pass

### Step 9: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all pass

## Test plan

- New test: `addChatMessage` with `selectedText` stores it correctly
- New test: `addChatMessage` without `selectedText` stores NULL
- New test: `getChatMessages` returns `selected_text` field
- Existing chat tests should pass unchanged (new parameter is optional)
- Pattern to follow: `src/db/__tests__/chat.test.ts`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; chat tests include selected_text tests
- [ ] `grep -n "selected_text" src/db/schema.ts` shows the migration
- [ ] `grep -n "selected_text" src/db/chat.ts` shows the interface and function changes
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The chat_messages table structure has changed since commit `9eea449`
- `addChatMessage` or `sendMessage` signatures have changed
- The migration fails on an existing database

## Maintenance notes

- The column is nullable — existing chat messages will have `selected_text = NULL`. No data migration needed.
- The UI chat components don't need changes for this plan. When the "select text → ask about it" feature is built, it will use this column to pass context.
- The PRD defines the column on the schema but the feature (text selection → chat) is a separate implementation.
