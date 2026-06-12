# Plan 065: Split NavPanel into child components and hooks

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/renderer/components/NavPanel.tsx src/renderer/components/notifications/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: readability
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

NavPanel.tsx is 392 lines with 11 useState hooks and 12 useCallback hooks. It handles three independent concerns: topic tree management (CRUD, expand/collapse, move bookmarks), notification polling/management, and panel chrome (tabs, search, user avatar). This makes it hard to test, modify, or reason about. Splitting it into focused child components and hooks follows the existing pattern — BookmarkDetail already uses 9 custom hooks.

## Current state

- `src/renderer/components/NavPanel.tsx:1-392` — the god component
- Notification logic: lines 76-94 (polling), 135-170 (handlers)
- Topic CRUD: lines 122-201 (create/rename/delete/move), 60-67 (refresh), 203-228 (render)
- Panel tabs/chrome: lines 233-295
- User avatar: lines 297-303, 314-321

The existing hook pattern: `src/renderer/components/bookmark-detail/hooks/` contains 9 hooks (useHashtags, useCustomSections, useChatSession, etc.).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/components/NavPanel.tsx` (modify — extract logic)
- `src/renderer/components/NavPanel.module.css` (no changes expected)
- New: `src/renderer/components/nav-panel/` directory with child components
- New: `src/renderer/components/nav-panel/hooks/` with extracted hooks

**Out of scope**:
- `src/renderer/components/TopicGroup.tsx` — already a child component
- `src/renderer/components/notifications/` — already extracted
- `src/renderer/components/SearchOverlay.tsx` — already extracted
- `src/renderer/components/ImportProgress.tsx` — already extracted

## Git workflow

- Branch: `advisor/065-split-navpanel`
- Commit: `refactor(ui): extract NavPanel into child components and hooks`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create useNotifications hook

Extract notification state and handlers into `src/renderer/components/nav-panel/hooks/useNotifications.ts`:

```typescript
// src/renderer/components/nav-panel/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import type { NotificationItem } from '../../notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const notifs = await window.api.getNotifications() ?? [];
        setNotifications(notifs);
        const count = await window.api.getUnreadCount() ?? 0;
        setUnreadCount(count);
      } catch { /* notifications not available yet */ }
    };
    load();
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await window.api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.warn('Failed to mark notification read:', err); }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await window.api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      setUnreadCount(0);
    } catch (err) { console.warn('Failed to mark all read:', err); }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await window.api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => {
        const notif = notifications.find(n => n.id === id);
        return notif?.read === 0 ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) { console.warn('Failed to delete notification:', err); }
  }, [notifications]);

  return { notifications, unreadCount, showNotifications, setShowNotifications, markRead, markAllRead, deleteNotification };
}
```

**Verify**: `pnpm typecheck` exits 0

### Step 2: Create useTopicTree hook

Extract topic tree state and CRUD into `src/renderer/components/nav-panel/hooks/useTopicTree.ts`:

```typescript
// src/renderer/components/nav-panel/hooks/useTopicTree.ts
import { useState, useEffect, useCallback } from 'react';

interface TopicTreeNode {
  id: string; name: string; parent_id: string | null;
  created_by: 'ai' | 'user'; created_at: string;
  children: TopicTreeNode[]; bookmark_count: number;
}

export function useTopicTree() {
  const [topicTree, setTopicTree] = useState<TopicTreeNode[]>([]);

  const refresh = useCallback(async () => {
    try {
      const tree = await window.api.getTopicTree();
      if (tree) setTopicTree(tree);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createTopic = useCallback(async (name: string) => {
    await window.api.createTopic(name, null);
    await refresh();
  }, [refresh]);

  const renameTopic = useCallback(async (id: string, name: string) => {
    await window.api.renameTopic(id, name);
    await refresh();
  }, [refresh]);

  const deleteTopic = useCallback(async (id: string) => {
    await window.api.deleteTopic(id);
    await refresh();
  }, [refresh]);

  const moveBookmark = useCallback(async (bookmarkId: string, targetTopicId: string | null) => {
    await window.api.moveBookmarkToTopic(bookmarkId, targetTopicId);
    await refresh();
  }, [refresh]);

  return { topicTree, refresh, createTopic, renameTopic, deleteTopic, moveBookmark };
}
```

**Verify**: `pnpm typecheck` exits 0

### Step 3: Create NavPanelTabs component

Extract the tabs bar into `src/renderer/components/nav-panel/NavPanelTabs.tsx`. This includes the expand/collapse, search, fetch, classify, mock mode, settings buttons, and notification bell. The component receives callbacks as props.

**Verify**: `pnpm typecheck` exits 0

### Step 4: Create NavPanelUser component

Extract user avatar display into `src/renderer/components/nav-panel/NavPanelUser.tsx`. Receives `userName` and `isExpanded` props.

**Verify**: `pnpm typecheck` exits 0

### Step 5: Create TopicCreateRow component

Extract the topic creation form (lines 344-375) into `src/renderer/components/nav-panel/TopicCreateRow.tsx`. Receives `onCreate` and `onCancel` props.

**Verify**: `pnpm typecheck` exits 0

### Step 6: Refactor NavPanel to compose child components

Rewrite `NavPanel.tsx` to import and compose the new hooks and child components. The component should shrink from 392 lines to ~120 lines. Remove all extracted state and handlers. Keep only the panel layout logic and the `renderTopicNodes` function (which depends on `bookmarkTopicMap`).

**Verify**: `pnpm typecheck` exits 0, `pnpm lint` exits 0

### Step 7: Run full verification

Run `pnpm check` (typecheck + lint + test).

**Verify**: `pnpm check` exits 0

## Test plan

- Existing TopicGroup test (`src/renderer/components/__tests__/TopicGroup.test.tsx`) should still pass
- No new tests required — this is a pure refactor with no behavior change
- Manual verification: NavPanel renders correctly, notifications work, topic CRUD works

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] NavPanel.tsx is under 150 lines
- [ ] `src/renderer/components/nav-panel/` directory exists with extracted components
- [ ] No behavior change — all existing tests pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- The extracted hooks have different behavior than the originals
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require modifying TopicGroup.tsx or notification components
