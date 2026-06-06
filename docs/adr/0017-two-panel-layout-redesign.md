# Two-Panel Layout Redesign

Removes the three-panel layout (sidebar + detail + bookmark list) and replaces it with a two-panel layout (detail + nav panel). The sidebar is eliminated; its content is redistributed. The right panel becomes a unified navigation/action bar with grouped bookmarks and action icons.

## Context

The original three-panel layout dedicated 250px to a sidebar that mostly contained navigation items (4 text links) and filter sections (priority, topics, content types). This wasted horizontal space — the sidebar was mostly empty air. Meanwhile the bookmark list (350px) was a flat, ungrouped scroll of all bookmarks with no hierarchy.

The redesign consolidates the sidebar and bookmark list into a single 350px right panel. Navigation becomes a vertical icon strip. Bookmarks are grouped by topic with collapsible sections (like Notion's sidebar). Priority becomes a visual badge only — no filter chips.

## Decision

**Two-panel layout, RTL direction.** The right panel (350px) is the navigation/action bar. The center panel (flex: 1) is the BookmarkDetail, unchanged.

### Right Panel Structure

```
+----------------------------------+---+
| [🔍]                             | [📑] |
|                                  | [📥] |
| ▼ تكنولوجيا (4)                  | [🏷] |
|   bookmark 1          high ●    | [⚙] |
|   bookmark 2          med ●     |   |
|   bookmark 3          low ●     |   |
|   [show more]                   |   |
| ▼ تصميم (2)                     |   |
|   ...                           |   |
+----------------------------------+---+
```

- **Vertical icon strip** (right edge): [📑] bookmarks (الإشارات المرجعية), [📥] fetch now (جلب الآن), [🏷] classify now (تصنيف الآن), [⚙] settings (الإعدادات)
- **Search icon** (top left of panel): opens overlay search modal
- **Grouped bookmark list**: always grouped by topic, 3 items per group, inline "show more", collapsible dropdowns, state remembered per group across sessions
- **Bookmark item**: title + domain + priority badge (colored dot: high/medium/low)
- **Priority**: visual badges only, no filter chips

### What's Removed

- Sidebar component (`Sidebar.tsx`) — deleted or refactored into NavPanel
- Flat bookmark list (`BookmarkList.tsx`) — replaced by grouped NavPanel
- Filter sections (priority, topics, content types) — replaced by topic grouping + priority badges
- App header ("بوكمارкс") — removed from panel (titlebar handles app identity)

### What's Unchanged

- Center panel: BookmarkDetail with BookmarkTabs, ContentsBar, BlockNote editor, EnhanceToolbar — no changes
- Responsive breakpoints: ≤600px switches to vertical stack

## Considered Options

1. **Swap sidebar and bookmark list, keep both** — keeps 3 panels but swaps positions. Rejected: still wastes space on two narrow panels.
2. **Merge into single right panel** (chosen) — eliminates redundancy, groups bookmarks by topic, adds icon strip for actions.
3. **Merge into single left panel** — same as option 2 but on left. Rejected: RTL means right is the natural starting position.

## Consequences

- **Files to create**: `NavPanel.tsx`, `TopicGroup.tsx`, `SearchOverlay.tsx`
- **Files to modify**: `App.tsx` (layout), `tokens.css` (width vars), `index.css` (panel styles)
- **Files to delete**: `Sidebar.tsx`, `BookmarkList.tsx` (or refactor into NavPanel)
- **State management**: topic group expand/collapse state needs persistence (localStorage or user config)
- **Filter state**: `FilterState` type in App.tsx简化 — only `topic` grouping remains, priority is display-only
