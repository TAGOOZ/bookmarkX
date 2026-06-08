# Article Parser — Structured Content Extraction

Hybrid article parser that extracts web page content into structured BlockNote blocks (`PartialBlock[]`). Primary pipeline: Defuddle (content extraction) + Turndown (HTML→Markdown) + `parseMDToBlocks` (Markdown→BlockNote). Gemini API as last-resort fallback. Auto-triggers on bookmark selection (one-time parse). Replaces the current `extractArticle` pipeline that sends URLs to Gemini for plain-text extraction.

## Considered Options

- **Gemini-only extraction** — Rejected: costs money per parse, no structured output, no local fallback
- **Local parser only (no fallback)** — Rejected: fails on JS-rendered pages, paywalled content
- **Readability + Cheerio (previous)** — Replaced: no content extraction step (processes raw `<body>` including nav/footers/ads), images/tables discarded as placeholders, nested lists flattened, heading level cap at h3, no code block language detection
- **Defuddle + Turndown (chosen)** — Chosen: Defuddle extracts clean article content (mobile-style detection, schema.org metadata), Turndown converts clean HTML→Markdown with full control over output rules, `parseMDToBlocks` maps Markdown to BlockNote blocks
- **Mozilla Readability + Turndown** — Considered: Readability is battle-tested but Defuddle (by kepano/Obsidian) has better mobile detection, built-in markdown output, and schema.org metadata extraction

## Pipeline Architecture

```
URL → fetch (Node fetch) → HTML string
  → Defuddle (content extraction) → clean HTML + metadata
  → Turndown (HTML→Markdown) → Markdown string
  → parseMDToBlocks → PartialBlock[] (BlockNote format)
  → services/extract.ts → DB (blocks_json TEXT column)
  → ArticleReaderBlock.tsx (renders blocks)

Fallback chain:
  1. Defuddle + Turndown + parseMDToBlocks (primary)
  2. Current cheerio parser (if Defuddle fails)
  3. Gemini API (last resort — JS-rendered, paywalled)
```

### Why Defuddle over Readability

| Feature | Defuddle | Readability |
|---------|----------|-------------|
| Content extraction | Mobile-style heuristic detection | Firefox Reader View algorithm |
| Metadata | schema.org + OpenGraph built-in | Basic metadata only |
| Markdown output | Built-in (optional) | No — HTML output only |
| Maintainer | kepano (Obsidian creator) | Mozilla |
| License | MIT | Apache-2.0 |
| DOM dependency | linkedom (lightweight) | None (but needs separate HTML→MD) |

### Why Turndown over node-html-markdown

| Feature | Turndown | node-html-markdown |
|---------|----------|-------------------|
| Custom rules | Extensive API for custom filter/replacement | Limited extensibility |
| Community | 11.2K stars, 4.9M weekly DL | 260 stars |
| Control | Fine-grained over every HTML→MD mapping | Opinionated defaults |
| Speed | 280ms/MB | 176ms/MB (faster but less flexible) |

Turndown chosen for control over custom rules (`<iframe>`, `<video>`, `<details>`, images with lazy loading attributes).

## New Dependencies

```json
{
  "defuddle": "^0.18.1",
  "turndown": "^7.2.4",
  "@types/turndown": "^5.0.5",
  "linkedom": "^0.18.0"
}
```

`linkedom` is preferred over `jsdom` — lighter weight, ESM-native, sufficient for Defuddle's DOM requirements in Electron.

## Phased Implementation

### Phase 1: Content Extraction Pipeline (3-4 days)

| Task | Files | Effort |
|------|-------|--------|
| Install `defuddle`, `linkedom` | package.json | 0.5h |
| Create `src/parser/extract-content.ts` — Defuddle wrapper | new file | 2h |
| Rewrite `local-parser.ts` pipeline: fetch → Defuddle → clean HTML | local-parser.ts | 4h |
| Install `turndown` + `@types/turndown` | package.json | 0.5h |
| Add `parseMDToBlocks` using Turndown output | local-parser.ts (new) | 4h |
| Fix heading level cap (remove h3 limit) | local-parser.ts | 0.5h |
| Add custom Turndown rules for `<iframe>`, `<video>`, `<audio>` | local-parser.ts | 2h |
| Update Gemini prompt for better block output | gemini-fallback.ts | 1h |
| Tests for new pipeline | __tests__/local-parser.test.ts | 3h |

### Phase 2: Image & Table Rendering (2-3 days)

| Task | Files | Effort |
|------|-------|--------|
| Parse markdown images to BlockNote blocks with `src`/`alt` | parseMDToBlocks | 2h |
| Parse markdown tables to BlockNote table blocks | parseMDToBlocks | 3h |
| Update `ArticleReaderBlock.tsx` to render `<img>` tags | ArticleReaderBlock.tsx | 2h |
| Update `ArticleReaderBlock.tsx` to render `<table>` elements | ArticleReaderBlock.tsx | 2h |
| Add lazy loading (`loading="lazy"`) to images | ArticleReaderBlock.tsx | 0.5h |
| Tests for image/table rendering | extensions.test.ts | 2h |

### Phase 3: Gemini & Error Handling (1-2 days)

| Task | Files | Effort |
|------|-------|--------|
| Replace `curl` with `fetch`/`undici` in gemini.ts | services/gemini.ts | 2h |
| Add retry with exponential backoff | services/gemini.ts | 2h |
| Add URL→result cache (SQLite or Map) | services/extract.ts | 2h |
| User-facing error UI when all parsers fail | BookmarkDetail.tsx | 2h |
| Update Gemini prompt for language hints | gemini-fallback.ts | 1h |

### Phase 4: Database & Search (1-2 days)

| Task | Files | Effort |
|------|-------|--------|
| Add migration: `parser_version`, `content_hash` columns | db/schema.ts | 1h |
| Add FTS5 virtual table on `extracted_text` | db/schema.ts | 1h |
| Fix duplicate rows (upsert in storeArticleContent) | db/article-content.ts | 1h |
| Add full-text search IPC handler | main.ts | 2h |
| Add search UI component | new component | 3h |

## Consequences

- Adds `defuddle`, `turndown`, `linkedom` as dependencies (all run in main process)
- Replaces `@mozilla/readability` and `cheerio` — remove from package.json
- Article content stored as `PartialBlock[]` (JSON) in `article_content.blocks_json` — same format as BlockNote editor
- No conversion layer between parser → storage → renderer → agent
- Auto-parse on bookmark selection means articles are ready to read immediately
- Existing `extractArticle` dead pipeline is replaced, not extended
- New IPC handler `get-article-content` added for renderer to read parsed content
- `ArticleReaderBlock` custom BlockNote block renders structured content as styled React
- Agent can access structured article blocks for RAG, chat context, and proactive suggestions
- `highlight.js` added as dependency for code block syntax highlighting (~20KB gzipped)
- Article reader uses compact typography (14px body, 1.5 line-height) matching app density
- Images render as actual `<img>` elements with `loading="lazy"` (not placeholders)
- Tables render as actual `<table>` elements with proper styling
- Collapse UI uses fixed header bar with chevron, word count, and reading time
- Links styled with underline + accent color for clear affordance
- Blockquotes minimal: italic + indent only, no border or background
- Full-width layout (no max-width constraint) for app-consistent density
- Article section blends into editor flow when expanded, not a distinct visual section
- `parser_version` column tracks parser improvements for re-extraction
- `content_hash` column detects source changes for cache invalidation
- FTS5 virtual table enables full-text search within extracted article text
- Upsert logic prevents duplicate `article_content` rows on re-parse

## Files Changed

| File | Current Role | Changes Needed |
|------|-------------|----------------|
| `src/parser/local-parser.ts` | Cheerio HTML parser | Major rewrite → Defuddle + Turndown pipeline |
| `src/parser/extract-content.ts` | (new) | Defuddle wrapper — content extraction |
| `src/parser/gemini-fallback.ts` | Gemini AI fallback | Update prompt, add retry, last-resort only |
| `src/parser/index.ts` | Orchestrator | Update pipeline order (Defuddle → Turndown → parseMDToBlocks) |
| `src/services/extract.ts` | DB storage | Add caching, upsert |
| `src/services/gemini.ts` | curl → Gemini API | Replace curl with fetch, add retry |
| `src/db/schema.ts` | SQLite schema | Add `parser_version`, `content_hash` columns, FTS5 |
| `src/db/article-content.ts` | Article CRUD | Upsert, content hash validation |
| `src/renderer/.../ArticleReaderBlock.tsx` | Article renderer | Images, tables, TOC, progress |
| `src/renderer/.../ArticleReaderBlock.module.css` | Article styles | Print CSS, image/table styles |
| `src/renderer/.../BookmarkDetail.tsx` | Main detail view | Error UI, reader mode, link previews |

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Defuddle fails on some sites | Keep current cheerio parser as fallback (chain: Defuddle → cheerio → Gemini) |
| Turndown output doesn't map cleanly to BlockNote | Custom Turndown rules + parseMDToBlocks adapter |
| Image URLs are external (CORS, 404) | Add error handling for broken images in renderer |
| DB migration breaks existing data | Test migration on copy of production DB |
| Gemini prompt changes break existing behavior | Version the prompt, keep old prompt as fallback |

## Problem Catalog (Solved by This Pipeline)

| Problem | Severity | Solution |
|---------|----------|----------|
| P1: No content extraction (nav/footers/ads in articles) | CRITICAL | Defuddle extracts clean article content |
| P2: Images discarded as placeholders | HIGH | Turndown preserves `<img>` → `![alt](src)` → parseMDToBlocks |
| P3: Tables discarded as placeholders | HIGH | Turndown converts `<table>` → markdown tables → parseMDToBlocks |
| P4: Nested lists flattened | MEDIUM | Turndown handles nested lists natively |
| P5: `<figure>`/`<figcaption>` → empty output | MEDIUM | Defuddle extracts figure content, Turndown converts |
| P7: Inline images in paragraphs invisible | MEDIUM | Turndown handles inline images in paragraphs |
| P8: Heading level cap at h3 | LOW | Remove cap — BlockNote supports h1-h6 |
| P6: No `<details>`/`<summary>` support | LOW | Custom Turndown rule converts to toggleable BlockNote block or keeps as HTML |
| P9: No code block language detection | MEDIUM | Turndown preserves code block language hints |
| P10: Gemini fallback is fragile and expensive | MEDIUM | Replace curl with fetch, add retry+backoff, URL→result cache, make last-resort only |
| P12: ArticleReaderBlock UX is primitive | MEDIUM | Full-screen/reader mode, print CSS, TOC from headings, reading progress bar |
| P13: No offline fallback | LOW | Defuddle runs locally (no API needed); Gemini fallback shows error with retry option |
| P16: No export/portability | LOW | BlockNote blocks → markdown serializer, export button, markdown import |
| P17: Embeds/iframes/videos silently dropped | MEDIUM | Custom Turndown rules convert to markdown links |
| P18: No link preview/unfurling | LOW | Extract OpenGraph metadata via Defuddle, render as styled link preview cards |
