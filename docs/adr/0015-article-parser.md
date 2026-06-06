# Article Parser — Structured Content Extraction

Hybrid article parser that extracts web page content into structured BlockNote blocks (`PartialBlock[]`). Local HTML parser (Readability + Cheerio) as primary, Gemini API as fallback. Zero-conversion pipeline: parser outputs the same format used by storage, rendering, and agent. Auto-triggers on bookmark selection (one-time parse). Replaces the current dead `extractArticle` pipeline that sends URLs to Gemini for plain-text extraction.

## Considered Options

- **Gemini-only extraction** — Rejected: current approach, costs money per parse, no structured output, no local fallback
- **Local parser only (no fallback)** — Rejected: fails on JS-rendered pages, paywalled content
- **Hybrid (local + Gemini fallback)** — Chosen: free local parsing for ~90% of pages, Gemini handles edge cases
- **Readability + custom DOM walker** — Rejected: reinvents cheerio, less maintainable
- **Readability + cheerio** — Chosen: Readability for article extraction, cheerio for structured block mapping

## Consequences

- Adds `@mozilla/readability` and `cheerio` as dependencies (both run in main process)
- Article content stored as `PartialBlock[]` (JSON) in `article_content.blocks_json` — same format as BlockNote editor
- No conversion layer between parser → storage → renderer → agent
- Auto-parse on bookmark selection means articles are ready to read immediately
- Existing `extractArticle` dead pipeline is replaced, not extended
- New IPC handler `get-article-content` added for renderer to read parsed content
- `ArticleReaderBlock` custom BlockNote block renders structured content as styled React
- Agent can access structured article blocks for RAG, chat context, and proactive suggestions
- `highlight.js` added as dependency for code block syntax highlighting (~20KB gzipped)
- Article reader uses compact typography (14px body, 1.5 line-height) matching app density
- Tables and images render as minimal text placeholders — not full renderers
- Collapse UI uses fixed header bar with chevron, word count, and reading time
- Links styled with underline + accent color for clear affordance
- Blockquotes minimal: italic + indent only, no border or background
- Full-width layout (no max-width constraint) for app-consistent density
- Article section blends into editor flow when expanded, not a distinct visual section
