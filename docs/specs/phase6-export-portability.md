# Phase 6: Export & Portability

## User Stories

1. As a user, I can export a bookmark's full content as a Markdown file
2. As a user, I can export a bookmark's full content as a JSON file (raw BlockNote blocks)
3. As a user, I can import a Markdown file into the current bookmark's Notes section

## Files to Create

### `src/parser/blocks-to-markdown.ts`

Pure function converting `PartialBlock[]` → Markdown string.

**`blocksToMarkdown(blocks: PartialBlock[]): string`**

Handles:
- Standard blocks: heading (h1-h6), paragraph, bulletListItem, numberedListItem, image
- Inline formatting: bold → `**text**`, italic → `*text*`, code → `` `text` ``, link → `[text](url)`
- Code fences (paragraph with `{ code: true }` content) → fenced code blocks
- Horizontal rules → `---`
- Custom blocks:
  - `dualLang` → section with English/Arabic headers
  - `articleReader` → parse `blocksJson` JSON and recurse
  - `collapsibleArticle` → content as plain text
  - `highlight` → blockquote with selectedText + note
  - `chat` → skip (not exportable)
  - `glossaryTerm` (inline) → `**term**: definition`
  - `referenceChip` → `[ref: sourceSection]`
  - `tableHtml` (article-specific) → pass-through HTML
  - `embed` → `[Embed: url](url)`
  - `video` → `[Video: url](url)`
  - `audio` → `[Audio: url](url)`

**`bookmarkToMarkdown(bookmark: BookmarkDetailData): string`**

High-level function that:
1. Calls `bookmarkToBlocks(bookmark)` to get blocks
2. Calls `blocksToMarkdown(blocks)` to serialize
3. Returns the Markdown string

### `src/parser/markdown-to-blocks.ts`

**`markdownToBlocks(markdown: string): PartialBlock[]`**

Wraps the existing `parseMDToBlocks` for the import direction. Reuses the existing parser since it already handles all standard markdown constructs. No new logic needed — just an alias/export.

## Files to Modify

### `src/main.ts`

Add IPC handlers:
- `export-bookmark` ← `(bookmarkId: string, format: 'md' | 'json', content: string, defaultName: string)` → Shows save dialog, writes file, returns `{ success: true, path: string }`
- `import-markdown` ← `()` → Shows open dialog, reads file, returns `{ content: string, fileName: string }` or `{ cancelled: true }`

### `src/preload.ts`

Expose:
- `exportBookmark: (bookmarkId: string, format: 'md' | 'json', content: string, defaultName: string) => Promise<{ success: boolean; path?: string }>`
- `importMarkdown: () => Promise<{ content?: string; fileName?: string; cancelled?: boolean }>`

### `src/renderer/types.ts`

Add to `Window.api` type:
- `exportBookmark: (bookmarkId: string, format: 'md' | 'json', content: string, defaultName: string) => Promise<{ success: boolean; path?: string }>`
- `importMarkdown: () => Promise<{ content?: string; fileName?: string; cancelled?: boolean }>`

### `BookmarkDetail.tsx`

- Add export dropdown button in toolbarRow with options: Markdown, JSON
- Add import button in toolbarRow
- On export click: call `blocksToMarkdown(editor.document)`, then IPC `exportBookmark`
- On import click: call IPC `importMarkdown`, parse result, insert into editor

### `BookmarkDetail.module.css`

- `.exportBtn` — export button styles
- `.exportDropdown` — dropdown menu
- `.importBtn` — import button styles

### Locales

Add keys:
- `exportMd` / `تصدير MD` — Export as Markdown
- `exportJson` / `تصدير JSON` — Export as JSON
- `importMd` / `استيراد MD` — Import Markdown
- `exportSuccess` / `تم التصدير` — Export successful notification
- `importSuccess` / `تم الاستيراد` — Import successful notification

## Test Plan

### `src/parser/__tests__/blocks-to-markdown.test.ts`

- Converts headings h1-h6 to markdown headings
- Converts paragraphs with inline bold/italic/code/link
- Converts bullet and numbered lists
- Converts images
- Converts code block (paragraph with code content)
- Converts horizontal rule
- Converts dualLang block
- Converts articleReader block (recurses into blocksJson)
- Converts highlight block
- Converts glossaryTerm inline
- Converts collapsibleArticle block
- Skips chat block
- Handles empty blocks array
- Handles Arabic text (round-trip)
- Converts nested article blocks (tableHtml, embed, video, audio)

### `src/parser/__tests__/markdown-to-blocks.test.ts`

- Standard markdown → blocks (reuses parseMDToBlocks tests — minimal tests needed)
- Round-trip: blocks → markdown → blocks preserves structure

## Dependencies

No new dependencies needed. The `parseMDToBlocks` function already exists and handles all standard constructs.
