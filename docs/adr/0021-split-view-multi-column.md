# Split View — Multi-Column Bookmark Detail

The BookmarkDetail center panel supports splitting into 2-3 vertical columns, each showing a different bookmark with its own BookmarkTab bar. Columns are resizable (300px minimum) via drag dividers. Only the active/focused column shows the Contents sidebar. Triggered by drag-to-edge, split button on tab, or right-click context menu. The NavPanel and app shell remain unchanged — splits only affect the center content area.

## Considered Options

- **Split center panel only** (chosen) — NavPanel stays single, center splits into columns. Clean separation, no duplicate navigation.
- **Split entire app** — Rejected: duplicate NavPanels waste space, confusing which panel controls which
- **Tab-based splits** — Rejected: tabs are horizontal, user explicitly asked for vertical splits
- **New window per bookmark** — Rejected: Electron multi-window complexity, breaks single-window UX

## Consequences

- New `SplitLayout` component manages column count, widths, and active column state
- Each column wraps a `BookmarkDetail` instance with its own `BookmarkTabs` bar
- Resize dividers between columns use pointer events with 300px min-width constraint
- Active column tracked via focus/pointerenter — only active column renders ContentsSidebar
- Split state persisted in localStorage (column bookmark IDs + widths) for session restore
- Maximum 3 columns enforced — attempting 4th split replaces the active column or blocks
- NavPanel bookmark selection opens in active column (or creates new column if < 3)
- Close button per column — closing last column returns to single-view
- Drag-to-edge: drag a BookmarkTab to left/right edge of center panel to create split
- Split button: small icon on BookmarkTab hover, click splits that tab into new column
- BookmarkTab right-click context menu: Close, Close All, Close to Right, Close to Left, Close All But This, separator, Open in New Column, Reopen Closed Tab
