# Plan 053: Split content.ts god handler into domain modules

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
- **Risk**: MED
- **Category**: readability
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

`src/main/ipc/content.ts` is 228 lines with 18 IPC channels covering 6 different domains. Every handler follows the same pattern: `const { fn } = await import('../../module'); const env = await getConfigEnv(); return fn(db, args, { apiKey: env.apiKey });`. This makes the file hard to navigate and review — a change to chat logic risks a merge conflict with glossary logic. Other IPC files are already split by domain (`bookmarks.ts`, `topics.ts`, `hashtags.ts`).

## Current state

- `src/main/ipc/content.ts` — 18 IPC handlers, 228 lines
- `src/main/ipc/bookmarks.ts` — already domain-split (exemplar)
- `src/main/ipc/topics.ts` — already domain-split
- `src/main/ipc/hashtags.ts` — already domain-split
- `src/main/ipc/index.ts` — registers all IPC handlers

**The handlers by domain**:

| Domain | Handlers |
|--------|----------|
| Chat | create-chat-session, get-chat-messages, send-chat-message |
| Glossary | add-glossary-term, search-glossary, get-all-glossary-terms, delete-glossary-term, export-glossary, generate-glossary |
| Highlights | save-highlight, get-highlights, delete-highlight |
| Notes | save-note, get-notes, delete-note, enhance-note |
| Sections | get-custom-sections, create-custom-section, update-custom-section, delete-custom-section, reorder-custom-sections |
| Search | search-articles, get-article-content |
| IO | export-bookmark, import-markdown |
| AI | summarize-bookmark, extract-article |

**Shared helpers**: `getConfigEnv()` and `checkCooldown()` are used by multiple handlers.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/ipc/content.ts` (will be reduced to ~40 lines)
- New files: `src/main/ipc/ipc-helpers.ts`, `content-chat.ts`, `content-glossary.ts`, `content-highlights.ts`, `content-notes.ts`, `content-sections.ts`, `content-search.ts`, `content-io.ts`
- `src/main/ipc/index.ts` (must import and register all new handlers)

**Out of scope**:
- `src/main/ipc/bookmarks.ts`, `src/main/ipc/topics.ts`, `src/main/ipc/hashtags.ts` (already split)
- Renderer components

## Steps

### Step 1: Create src/main/ipc/ipc-helpers.ts

Extract `getConfigEnv` and `checkCooldown` into a shared helpers module:

```typescript
// src/main/ipc/ipc-helpers.ts
import { readConfig } from '../../config';
import type { Client } from '@libsql/client';

export async function getConfigEnv(): Promise<{ apiKey: string }> {
  const config = await readConfig();
  return { apiKey: config.geminiApiKey };
}

// Include checkCooldown if it exists in content.ts
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Create content-chat.ts

Create `src/main/ipc/content-chat.ts` with the 3 chat handlers. Each handler imports from `ipc-helpers.ts` for `getConfigEnv`.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Create content-glossary.ts

Create `src/main/ipc/content-glossary.ts` with the 6 glossary handlers.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Create content-highlights.ts, content-notes.ts, content-sections.ts, content-search.ts, content-io.ts

Create the remaining domain modules, each with its handlers.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Update content.ts to keep only summarize/extract

Reduce `content.ts` to only contain `summarize-bookmark` and `extract-article` (the AI-heavy handlers that need `getConfigEnv`). Import `getConfigEnv` from `ipc-helpers.ts`.

**Verify**: `wc -l src/main/ipc/content.ts` → under 60 lines

### Step 6: Update src/main/ipc/index.ts

Import and register all new domain modules in `index.ts`. Follow the pattern used for `bookmarks.ts`, `topics.ts`, `hashtags.ts`.

**Verify**: `pnpm typecheck` → exit 0

### Step 7: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0, all pass

## Test plan

- Existing tests should continue to pass
- No new tests needed — this is a pure structural refactor

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `content.ts` is under 100 lines
- [ ] Each new domain file is under 60 lines
- [ ] `src/main/ipc/ipc-helpers.ts` contains `getConfigEnv` and `checkCooldown`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The refactor requires changing how handlers are registered in the preload script
- A handler depends on state from another domain (cross-domain coupling)
