# Bookmark Detail / Editor Redesign

## Problem

The BookmarkDetail component (857 lines) has accumulated features without reorganizing the UI. Problems:

1. **Toolbar overload**: 8+ buttons with cryptic labels (`Σ`, `G`, `+§`, `↓MD`) in a flat row, no grouping
2. **Dead code**: `PageHeader` component exists but is unused; metadata is injected as raw text into BlockNote
3. **Banner stacking**: Enhanced text, parsing, and error banners pile up, pushing editor content down
4. **Hashtag bar placement**: Tags compete with editor for vertical space
5. **Glossary confusion**: Two affordances (`G` to generate, `📖` to view) with unclear relationship
6. **No visual hierarchy**: Toolbar buttons, banners, hashtags, and editor all have equal visual weight

## Design Principles (from PRODUCT.md)

- Task-first, not chrome-first
- One continuous BlockNote doc
- Obsidian as north star (clean whitespace, typography hierarchy, compact navigation)
- Arabic-first, RTL layout

## Proposed Layout

```
┌─────────────────────────────────────────────────────┐
│ BookmarkTabs (existing, unchanged)                  │
├─────────────────────────────────────────────────────┤
│ ContentsBar (existing, unchanged)                   │
├─────────────────────────────────────────────────────┤
│ PageHeader                                          │
│   Title                                             │
│   URL (clickable)                                   │
│   Metadata: topic | type | priority | time | date   │
│   Hashtags: #tag1 #tag2 [+add]                     │
├─────────────────────────────────────────────────────┤
│ EditorToolbar (NEW, minimal, sticky)                │
│   [.Reader] [ Collapse]          [Actions ▾] [?]    │
├─────────────────────────────────────────────────────┤
│ Status area (only shows when active, minimal)       │
│   Parsing: thin spinner + "Extracting..."           │
│   Error: inline banner with retry                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ BlockNote Editor (scrollable)                       │
│   Summary (dual-lang block)                         │
│   Glossary (inline glossary terms)                  │
│   Article (collapsible reader block)                │
│   Highlights (highlight blocks)                     │
│   Notes (editable paragraphs)                       │
│   Custom Sections (insertable)                      │
│   Chat (chat block)                                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [GlossaryPanel slides in from right, when toggled]  │
└─────────────────────────────────────────────────────┘
```

## Component Changes

### 1. PageHeader (wire up existing)

**File**: `PageHeader.tsx` + `PageHeader.module.css` (already exists, minor updates)

**What it does**: Renders structured metadata above the editor.

**Changes**:
- Add hashtag display and add/remove inline
- Add priority color coding (use existing `--priority-*` tokens)
- Make URL clickable with external link icon
- Keep it compact: single line for meta items, no wrapping cards

**Props** (update existing):
```tsx
interface PageHeaderProps {
  title: string;
  url?: string;
  topic?: string;
  contentType?: string;
  priority?: string;
  readingTime?: number;
  createdAt?: string;
  hashtags?: Array<{ id: string; name: string }>;
  onOpenUrl?: (url: string) => void;
  onAddHashtag?: (name: string) => void;
  onRemoveHashtag?: (id: string) => void;
}
```

### 2. EditorToolbar (NEW)

**File**: `EditorToolbar.tsx` + `EditorToolbar.module.css` (new)

**What it does**: Minimal sticky toolbar with grouped actions.

**Layout**:
```
[Reader mode] [Expand/Collapse all]     [Actions dropdown]
```

**Left group** (document view controls):
- Reader mode toggle (⛶ icon, labeled on hover)
- Expand/collapse all (⇕ icon, labeled on hover)

**Right group** (Actions dropdown):
- A single "Actions" button with dropdown containing:
  - AI section: "Summarize", "Generate Glossary"
  - I/O section: "Export Markdown", "Export JSON", "Import Markdown"
  - Organization section: "Add Custom Section"
- Keyboard shortcut hints in dropdown items

**Design**:
- Height: 32px (same as current toolbar)
- Sticky below ContentsBar
- Subtle bottom border, no background (blends with editor bg)
- Buttons use existing `.toolbarBtn` styles
- Dropdown uses existing menu patterns from BookmarkTabs context menu

### 3. BookmarkDetail (refactor)

**File**: `BookmarkDetail.tsx`

**Changes**:
- Remove toolbar button rendering (moved to EditorToolbar)
- Remove hashtag bar (moved to PageHeader)
- Remove enhanced text banner (convert to toast notification)
- Wire up PageHeader component
- Wire up EditorToolbar component
- Keep: progress bar, editor, custom sections, glossary panel, selection toolbar

**State removal**:
- Remove `showGlossaryPanel` state (move to EditorToolbar dropdown or keep as separate toggle)
- Remove hashtag-related state and handlers (move to PageHeader)
- Keep: `isReaderMode`, `isSummarizing`, `isGeneratingGlossary`, `isParsing`, `parseError`

### 4. Enhanced Text → Toast

**Current**: Persistent banner below toolbar showing enhanced text.

**Proposed**: Replace with a toast notification (already have `.notification` style). Show for 5 seconds, dismissible. Click to copy enhanced text.

### 5. Glossary Relationship (clarify)

**Current**: `G` button generates terms, `📖` button opens panel. Relationship unclear.

**Proposed**:
- Remove `G` button from toolbar
- Add "Generate Glossary" to Actions dropdown
- `📖` becomes a toggle in EditorToolbar left group (shows/hides GlossaryPanel)
- When glossary panel is open, editor shrinks to accommodate it (existing behavior)

### 6. Selection Toolbar (keep as-is)

**File**: `EnhanceToolbar.tsx` (no changes needed)

The floating selection toolbar is context-sensitive and works well. Keep it.

### 7. ContentsBar (no changes)

Already works well as a minimal navigation aid.

### 8. BookmarkTabs (no changes)

Already works well.

## Feature Distribution Summary

| Feature | Current Location | New Location |
|---------|-----------------|--------------|
| Title | BlockNote doc (text) | PageHeader (structured) |
| URL | BlockNote doc (text) | PageHeader (clickable link) |
| Topic/Type/Priority/Time/Date | BlockNote doc (text) | PageHeader (meta row) |
| Hashtags | Dedicated hashtag bar | PageHeader (inline chips) |
| Reader mode | Toolbar button | EditorToolbar left group |
| Expand/collapse all | Toolbar button | EditorToolbar left group |
| Summarize | Toolbar button | EditorToolbar Actions dropdown |
| Generate glossary | Toolbar button | EditorToolbar Actions dropdown |
| Export MD/JSON | Toolbar buttons | EditorToolbar Actions dropdown |
| Import MD | Toolbar button | EditorToolbar Actions dropdown |
| Add custom section | Toolbar button | EditorToolbar Actions dropdown |
| Open glossary panel | Toolbar button | EditorToolbar left group (toggle) |
| Enhanced text | Persistent banner | Toast notification |
| Parsing status | Banner | Thin status line (existing progress bar) |
| Error | Banner | Inline status with retry |
| Selection actions | Floating toolbar | Unchanged |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `PageHeader.tsx` | Modify | Add hashtag props, priority color |
| `PageHeader.module.css` | Modify | Add hashtag chip styles, priority indicators |
| `EditorToolbar.tsx` | Create | New minimal toolbar with dropdown |
| `EditorToolbar.module.css` | Create | Toolbar and dropdown styles |
| `BookmarkDetail.tsx` | Refactor | Remove toolbar/hashtag code, wire up new components |
| `BookmarkDetail.module.css` | Modify | Remove unused styles, adjust layout |
| `EnhanceToolbar.tsx` | No change | Keep as-is |
| `ContentsBar.tsx` | No change | Keep as-is |
| `BookmarkTabs.tsx` | No change | Keep as-is |
| `GlossaryPanel.tsx` | No change | Keep as-is |
| `CustomSection.tsx` | No change | Keep as-is |
| `bookmarkToBlocks.ts` | Modify | Remove metadata injection (title, URL, meta) since PageHeader handles it |

## What NOT to Change

- The BlockNote editor and all custom block types (dualLang, articleReader, highlight, chat, etc.)
- The selection toolbar (EnhanceToolbar)
- The ContentsBar navigation
- The BookmarkTabs and context menu
- The GlossaryPanel
- The CustomSection component
- The split view layout

## Implementation Order

1. **EditorToolbar** — Create new component with dropdown
2. **PageHeader** — Add hashtag props and priority color
3. **BookmarkDetail** — Refactor to use new components, remove old toolbar/hashtag code
4. **bookmarkToBlocks** — Remove metadata injection
5. **BookmarkDetail.module.css** — Clean up unused styles
6. **Enhanced text → toast** — Replace banner with notification

## Testing

- Verify all toolbar actions still work (summarize, glossary, export, import, custom sections)
- Verify hashtags add/remove correctly in PageHeader
- Verify PageHeader displays all metadata correctly
- Verify reader mode toggle works
- Verify expand/collapse all works
- Verify glossary panel open/close works
- Verify selection toolbar still appears on text selection
- Verify RTL layout still works
- Verify no regressions in BlockNote editor functionality
