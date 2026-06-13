# Plan 073: Lazy-load non-critical IPC handler modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e4bb75e..HEAD -- src/main/ipc/index.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e4bb75e`, 2026-06-13

## Why this matters

`src/main/ipc/index.ts` statically imports all 15 IPC handler modules at the top. When `registerAllIpc()` is called, every module is parsed and evaluated even though the renderer only calls a few IPC channels on startup (get-bookmarks, get-classifications, get-settings). The heavy modules like `pipeline`, `content-chat`, `content-glossary`, etc. can be deferred until their channels are first invoked.

## Current state

- `src/main/ipc/index.ts:1-16` — 15 static imports:
```typescript
import { registerBookmarkIpc } from './bookmarks';
import { registerSettingsIpc } from './settings';
import { registerTwitterIpc } from './twitter';
import { registerPipelineIpc } from './pipeline';
import { registerContentIpc } from './content';
import { registerContentChatIpc } from './content-chat';
import { registerContentGlossaryIpc } from './content-glossary';
import { registerContentHighlightsIpc } from './content-highlights';
import { registerContentNotesIpc } from './content-notes';
import { registerContentSectionsIpc } from './content-sections';
import { registerContentSearchIpc } from './content-search';
import { registerContentIoIpc } from './content-io';
import { registerTopicIpc } from './topics';
import { registerHashtagIpc } from './hashtags';
import { registerNotificationIpc } from './notifications';
```

Convention: The codebase already uses dynamic `import()` in `src/main/ipc/content.ts:14,24` for service modules.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/main/ipc/index.ts`

**Out of scope**:
- Individual IPC handler modules (bookmarks.ts, settings.ts, etc.)
- `src/main.ts`

## Git workflow

- Branch: `advisor/073-lazy-load-ipc-modules`
- Commit: `perf(ipc): lazy-load non-critical IPC handler modules`

## Steps

### Step 1: Split IPC modules into critical and deferred

Keep the 3 modules needed at startup as static imports (bookmarks, settings, topics — these are called immediately by the renderer). Convert the remaining 12 to dynamic imports inside `registerAllIpc`.

Replace the entire content of `src/main/ipc/index.ts` with:

```typescript
import type { Client } from '@libsql/client';
import { registerBookmarkIpc } from './bookmarks';
import { registerSettingsIpc } from './settings';
import { registerTopicIpc } from './topics';
import { type IpcMain } from 'electron';

let registered = false;

export function registerAllIpc(ipcMain: IpcMain, db: Client) {
  if (registered) return;
  registered = true;

  // Critical: registered synchronously for immediate renderer use
  registerBookmarkIpc(ipcMain, db);
  registerSettingsIpc(ipcMain);
  registerTopicIpc(ipcMain, db);

  // Deferred: registered async, available by the time renderer needs them
  Promise.all([
    import('./twitter'),
    import('./pipeline'),
    import('./content'),
    import('./content-chat'),
    import('./content-glossary'),
    import('./content-highlights'),
    import('./content-notes'),
    import('./content-sections'),
    import('./content-search'),
    import('./content-io'),
    import('./hashtags'),
    import('./notifications'),
  ]).then((modules) => {
    modules.forEach((mod) => {
      const register = mod.registerTwitterIpc
        ?? mod.registerPipelineIpc
        ?? mod.registerContentIpc
        ?? mod.registerContentChatIpc
        ?? mod.registerContentGlossaryIpc
        ?? mod.registerContentHighlightsIpc
        ?? mod.registerContentNotesIpc
        ?? mod.registerContentSectionsIpc
        ?? mod.registerContentSearchIpc
        ?? mod.registerContentIoIpc
        ?? mod.registerHashtagIpc
        ?? mod.registerNotificationIpc;
      if (register) register(ipcMain, db);
    });
  }).catch((err) => {
    console.error('Failed to register deferred IPC handlers:', err);
  });
}
```

Actually, the above is too clever. A simpler approach — just call each module's register function explicitly:

```typescript
import type { Client } from '@libsql/client';
import { registerBookmarkIpc } from './bookmarks';
import { registerSettingsIpc } from './settings';
import { registerTopicIpc } from './topics';
import { type IpcMain } from 'electron';

let registered = false;

export function registerAllIpc(ipcMain: IpcMain, db: Client) {
  if (registered) return;
  registered = true;

  // Critical: registered synchronously for immediate renderer use
  registerBookmarkIpc(ipcMain, db);
  registerSettingsIpc(ipcMain);
  registerTopicIpc(ipcMain, db);

  // Deferred: imported async — available by the time renderer calls these channels
  (async () => {
    const [
      { registerTwitterIpc },
      { registerPipelineIpc },
      { registerContentIpc },
      { registerContentChatIpc },
      { registerContentGlossaryIpc },
      { registerContentHighlightsIpc },
      { registerContentNotesIpc },
      { registerContentSectionsIpc },
      { registerContentSearchIpc },
      { registerContentIoIpc },
      { registerHashtagIpc },
      { registerNotificationIpc },
    ] = await Promise.all([
      import('./twitter'),
      import('./pipeline'),
      import('./content'),
      import('./content-chat'),
      import('./content-glossary'),
      import('./content-highlights'),
      import('./content-notes'),
      import('./content-sections'),
      import('./content-search'),
      import('./content-io'),
      import('./hashtags'),
      import('./notifications'),
    ]);

    registerTwitterIpc(ipcMain);
    registerPipelineIpc(ipcMain, db);
    registerContentIpc(ipcMain, db);
    registerContentChatIpc(ipcMain, db);
    registerContentGlossaryIpc(ipcMain, db);
    registerContentHighlightsIpc(ipcMain, db);
    registerContentNotesIpc(ipcMain, db);
    registerContentSectionsIpc(ipcMain, db);
    registerContentSearchIpc(ipcMain, db);
    registerContentIoIpc(ipcMain);
    registerHashtagIpc(ipcMain, db);
    registerNotificationIpc(ipcMain, db);
  })().catch((err) => {
    console.error('Failed to register deferred IPC handlers:', err);
  });
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing IPC tests in `src/main/ipc/__tests__/content.test.ts` should pass — they import the modules directly, not through the index
- No new tests needed

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "^import.*from '\.\/" src/main/ipc/index.ts` shows only 3 static imports (bookmarks, settings, topics)
- [ ] No files outside `src/main/ipc/index.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/main/ipc/index.ts` doesn't match the excerpts above
- Tests fail after the change
- A renderer IPC call fails because its handler wasn't registered in time

## Maintenance notes

- When adding new IPC modules, determine if they're critical (called on startup) or deferred
- Critical: add as static import. Deferred: add to the `Promise.all` array
- The `Promise.all` ensures all deferred modules load in parallel, not sequentially
- If a renderer IPC call arrives before its handler is registered, Electron returns a rejection — the renderer already handles this via error boundaries
