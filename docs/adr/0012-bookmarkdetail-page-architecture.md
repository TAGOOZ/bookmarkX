# BookmarkDetail Page Architecture

Redesigns BookmarkDetail from a flat info panel into an Obsidian-style document page with Outline's visual language. Built from scratch with lightweight React components + CSS Modules — no Outline code fork. The page is a single scrollable view with a horizontal Contents bar (vertical dashes above the editor, hover to reveal titles, click to jump), six sections (Summary → Glossary → Article → Highlights → Notes → Chat), and three switchable layout modes (linear/two-column/collapsible). Agent owns Summary/Glossary/Chat; user owns Highlights/Notes. Selection-based "Enhance" on user notes. Hover-to-copy sentence-level reference links from agent sections to user notes. Dual theme (dark + light) using Obsidian CSS custom properties. Empty sections hidden. Article is inline but collapsible.

## Notes Editor Decision

**Use BlockNote** (`@blocknote/react`, `@blocknote/core`, `@blocknote/mantine`) for the Notes section.

- BlockNote is the same editor Docmost uses — Notion-style block editing
- Handles rich text, formatting, slash commands, blocks out of the box
- No need to build a custom textarea or contentEditable component
- Install: `npm install @blocknote/react @blocknote/core @blocknote/mantine`
- CSS Modules for styling around the editor, BlockNote handles the editor itself

## Current State

The current `NotesEditor.tsx` is a plain `<textarea>` — not a real editor. Must be replaced with BlockNote.

The current `ChatPanel.tsx` CSS is basic — needs Obsidian design tokens applied.

## Implementation Impact

Switching to BlockNote changes the `NotesEditor` interface:

**Before (textarea):**
```tsx
<NotesEditor content={bookmark.notes || ''} onChange={onNotesChange || noop} />
// Props: { content: string; onChange: (content: string) => void }
```

**After (BlockNote):**
```tsx
<NotesEditor initialContent={bookmark.notes || ''} onChange={onNotesChange || noop} />
// Props: { initialContent: string; onChange: (content: Block[]) => void }
// BlockNote uses block-based content, not plain strings
```

**Files that need updating:**
1. `NotesEditor.tsx` — replace textarea with `useCreateBlockNote` + `EditorContent`
2. `NotesEditor.module.css` — style wrapper only, BlockNote handles its own editor styles
3. `types.ts` — `notes` field may need to change from `string` to `Block[]` or keep as string with JSON serialization
4. `BookmarkDetail.tsx` — update `NotesEditor` props call
5. `BookmarkDetailData` in `types.ts` — decide: store notes as JSON string or as Block array

**Serialization decision:** Store notes as JSON string in DB (`JSON.stringify(blocks)`), parse on load. Keeps DB schema simple, allows future editor swaps.
