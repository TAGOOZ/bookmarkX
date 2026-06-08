# Product Requirement Document: BookmarkX

## 1. Overview

**BookmarkX** is a personal knowledge management desktop app that solves "bookmark FOMO" — the anxiety of saving links you never read. It automatically fetches your X/Twitter bookmarks, classifies them by priority and topic using AI, and provides on-demand Egyptian Arabic summaries with contextual glossaries for technical content.

## 2. Goals

- Eliminate bookmark FOMO by making saved content immediately actionable
- Reduce cognitive load via AI-powered triage (classify before you read)
- Bridge the language gap for English technical content with Egyptian Arabic summaries
- Build a personal glossary of technical terms in Egyptian Arabic

## 3. Target Users

- Primary: You (personal use)
- Future: Other Arabic-speaking developers/tech workers who bookmark English content

## 4. Phased Release Plan

### Phase 0: User Account & Authentication

**User Stories:**
- As a user, the app auto-detects my Chrome profile on Linux and extracts X/Twitter cookies
- As a user, I can log in to X/Twitter directly via an in-app browser window (no manual cookie extraction)
- As a user, I can manually enter auth tokens as a fallback
- As a user, my profile (name, Twitter handle, API keys, preferences) is stored in a JSON config file
- As a user, on first launch the app works immediately but shows a subtle banner prompting to complete setup
- As a user, I can configure theme (dark/light), language (RTL/LTR), notifications, fetch frequency, and AI model

**Acceptance Criteria:**
- Chrome profile auto-detection scans `~/.config/google-chrome/` for available profiles (Linux)
- Cookie extraction reads `auth_token` and `ct0` from Chrome's unencrypted SQLite cookie DB
- Twitter login opens an Electron BrowserWindow to `x.com/login`, captures session cookies after login
- User config stored as `user.json` in userData dir (`~/.config/bookmarkX/user.json`)
- Config format: flat JSON with fields: name, twitterHandle, geminiApiKey, birdAuthToken, birdCt0, birdChromeProfile, theme, language, notifications, fetchFrequency, aiModel
- `.env` file is deleted; all settings migrate to `user.json`
- Settings UI shows two equal options: "Login with Twitter" button + manual token entry
- Auto-detect fills fields automatically when Chrome profile is found
- First-run: app works with empty config, shows prompt banner to complete setup
- Profile section lives in Settings modal (not sidebar)

**Agent-ready note:** User config module (`user-config.ts`) must expose typed read/write functions. No UI coupling. Config is the single source of truth for auth tokens and preferences.

### Phase 0.5: Internationalization (i18n) & Bidirectional Layout

**User Stories:**
- As a user, I can switch the app language between Arabic and English in Settings
- As a user, when I switch language, the entire app chrome (labels, headings, buttons, navigation, tabs) updates to the selected language
- As a user, the layout direction mirrors automatically — Arabic shows RTL (nav panel right), English shows LTR (nav panel left)
- As a user, every bookmark displays a title in the current UI language, falling back to the other language if unavailable
- As a user, I see a restart prompt after changing language, with Restart Now / Later options
- As a user, the titlebar text follows the UI language (بوكماركس / BookmarkX)
- As a user, bookmark content direction (editor, tabs) follows the UI language, not content detection

**Acceptance Criteria:**
- Separate translation files: `locales/ar.json` and `locales/en.json` with all UI strings
- ALL hardcoded strings converted to `intl.formatMessage()` (NavPanel, SearchOverlay, TopicGroup, ArticleReaderBlock, titlebar)
- CSS uses logical properties (`padding-inline-start`, `margin-inline-end`, `border-inline-start`, `text-align: start`) instead of physical properties
- Global `.app-container` direction switches dynamically via React context (not hardcoded CSS)
- `<html>` element `dir` and `lang` attributes managed by React component reading locale context
- Locale state stored in React context, persisted to `user.json`
- Language setting change triggers restart prompt (toast/modal with Restart/Later)
- App restarts cleanly on language change (reloads window)
- `bookmarks` table gains `title_ar TEXT` and `title_en TEXT` columns (replaces single `title` column)
- Bookmark title display: show preferred language title, fall back to other language if NULL
- NavPanel position flips: Arabic → right, English → left
- BookmarkTabs direction follows UI language
- All 53 existing translation keys have both Arabic and English values
- New keys added for all previously hardcoded strings
- `react-intl` remains the i18n framework (no new dependencies)

**Components to modify:**
1. `App.tsx` — extract `messages` to `locales/ar.json`, add `locales/en.json`, pass locale from context to `IntlProvider`, manage `<html>` dir/lang
2. `Settings.tsx` — language selector triggers save + restart prompt
3. `NavPanel.tsx` — convert 5 hardcoded Arabic strings to `intl.formatMessage()`
4. `SearchOverlay.tsx` — convert 2 hardcoded strings to `intl.formatMessage()`
5. `TopicGroup.tsx` — convert 2 hardcoded strings to `intl.formatMessage()`
6. `ArticleReaderBlock.tsx` — convert "Article" label to `intl.formatMessage()`
7. `index.html` — remove hardcoded `dir="rtl" lang="ar"`, set dynamically
8. `index.css` — remove hardcoded `direction: rtl` from `.app-container`, convert physical CSS properties to logical
9. All CSS Modules — convert `padding-left/right`, `margin-left/right`, `border-left/right` to logical equivalents
10. Database migration — add `title_ar`, `title_en` columns to `bookmarks` table

**Architecture decisions:**
- See [ADR-0018: Internationalization & Bidirectional Layout](docs/adr/0018-i18n-bidirectional-layout.md)

**Agent-ready note:** Translation files are data, not logic. The i18n service (`getLocale()`, `setLocale()`) must be a pure service function with typed I/O. Agent can call the same function to read/write locale preference.

### Phase 1: MVP — Fetch & Classify

**User Stories:**
- As a user, bookmarks are fetched automatically every 6 hours (configurable via user.json)
- As a user, I can manually trigger a fetch at any time (resets the 6-hour timer)
- As a user, each bookmark is auto-classified with: Priority (high/medium/low), Topic (one, hierarchical), Hashtags (many, flat), Reading time estimate
- As a user, I can browse bookmarks in a 2-panel layout (grouped nav panel + detail)
- As a user, I can browse bookmarks grouped by topic with collapsible sections
- As a user, I can search bookmarks via an overlay search modal
- As a user, I can trigger fetch, classify, and open settings from icon buttons in the nav panel
- As a user, I get desktop notifications + in-app badge for high-priority new bookmarks
- As a user, the app works offline with previously fetched data
- As a user, I can import hundreds of Twitter bookmarks in batches with progress tracking
- As a user, I can create custom topics and move bookmarks between topics
- As a user, I can tag bookmarks with multiple hashtags independent of topic

**Acceptance Criteria:**
- bird.fast CLI is bundled or accessible from the Electron app
- Classification uses <1s per bookmark (cheap AI call on metadata only)
- 2-panel layout renders in <100ms
- Offline mode shows cached bookmarks
- Full RTL layout: nav panel (right) + detail (center) mirror for Arabic text
- Mixed Arabic/English text renders correctly (bidirectional text support)
- Thmanyah font family loaded and applied to Arabic text
- Auth tokens come from user.json (Phase 0) — no .env dependency
- Sensitive values (API keys, tokens) are masked in the UI

**Agent-ready note:** Classification service (`classifyBookmark()`) must use service-layer abstraction with typed I/O and event emission. No UI coupling. Ready for future agent invocation.

### Phase 2: BookmarkDetail Page + Summarize, Chat & Glossary

Phase 2 delivers the core reading/annotation view AND the AI features that live inside it. The BookmarkDetail page is redesigned from a flat info panel into a single continuous BlockNote document.

#### 2A: BookmarkDetail Page Architecture

The BookmarkDetail is a single continuous BlockNote document containing all sections (Summary → Glossary → Article → Highlights → Notes → Chat) in one scrollable editor. Article section is collapsible with no borders — seamless integration. Text can be selected across sections for mentioning in chat. Built on BlockNote (`@blocknote/react`, `@blocknote/core`, `@blocknote/mantine`).

**Page Anatomy (top to bottom):**

```
┌──────────────────────────────────────────────────────────┐
│            Contents Bar (vertical minimap)                │
│     |     |     |     |     |     |                      │
│   Summary Glossary Article Highlights Notes Chat          │
│  (hover → titles, click → jump)                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Title (large, bold)                                     │
│  Metadata line (topic · priority · reading time)         │
│                                                          │
│  ┌─ Summary (agent) ──────────────────────────────────┐  │
│  │  Dual-language summary                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Glossary (agent + user) ──────────────────────────┐  │
│  │  Term definitions, user can add custom terms        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Article (collapsible, no borders) ────────────────┐  │
│  │  Structured BlockNote blocks, expand/collapse       │  │
│  │  Text selectable for chat/mentions                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Highlights (user) ────────────────────────────────┐  │
│  │  Selected text with notes                           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Notes (user) ─────────────────────────────────────┐  │
│  │  User-written notes, [Enhance] on selection         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Chat (agent) ─────────────────────────────────────┐  │
│  │  Inline AI conversation with article context        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Custom Section (user-created, per-bookmark) ──────┐  │
│  │  Named section, insertable before/between/after     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Section ownership:**
| Section | Owner | Can edit? |
|---------|-------|-----------|
| Summary | Agent | Agent writes, user cannot edit |
| Glossary | Agent + User | Agent generates, user can add terms |
| Article | System | Structured BlockNote blocks, read-only |
| Highlights | User | User selects text, adds notes |
| Notes | User | User writes, agent can enhance |
| Chat | Agent + User | User asks, agent responds |
| Custom | User | Named sections, per-bookmark |

**Key interactions:**
- **One continuous BlockNote doc**: All sections live in a single BlockNote editor. No borders between sections. Article is collapsible but part of the same document.
- **Text selection across sections**: User can select text from any section to mention in chat or ask about.
- **Custom sections**: User can add named sections and place them before, between, or after fixed sections (per-bookmark).
- **BlockNote fonts**: English text uses Shantell Sans (Google Fonts CDN), Arabic text uses Playpen Sans Arabic (Google Fonts CDN). Applied via `.bn-editor` CSS override only.
- **Contents bar**: Vertical minimap that mirrors NavPanel position (left in Arabic, right in English). Visual inverse color scheme vs NavPanel. Hover reveals section titles; click to jump.
- **Enhance**: User selects text in their notes → floating toolbar → "Enhance" button → agent improves selection without rewriting
- **Reference links**: User hovers over any sentence in an agent section → link icon appears → click to copy reference → paste in notes → renders as clickable chip → jumps to that sentence
- **Empty sections**: Hidden entirely when no content exists

**Components to build:**
1. `BookmarkTabs` — horizontal tab bar for open bookmarks (~80 lines)
2. `ContentsBar` — horizontal minimap aligned with app title (~60 lines)
3. `PageHeader` — title + metadata line (~80 lines)
4. `SectionRenderer` — renders each section type (custom)
5. `ArticleView` — Defuddle-extracted content, collapsible (custom)
6. `NotesEditor` — **BlockNote editor** (`@blocknote/react`, `@blocknote/core`, `@blocknote/mantine`) — Notion-style rich text, same as Docmost. Handles formatting, blocks, slash commands out of the box. Props change from `(content: string, onChange: (s: string) => void)` to `(initialContent: string, onChange: (blocks: Block[]) => void)`. Store as JSON string in DB.
7. `ChatPanel` — inline chat UI (custom)
8. `ReferenceChip` — inline reference link chip (custom)
9. `EnhanceToolbar` — floating toolbar on text selection (custom)

**Visual direction:**
- Dual theme: dark (#1e1e1e) + light (white), switchable
- Obsidian CSS variables: `--background-primary`, `--radius-s`, `--text-normal`, etc.
- Outline-inspired: clean whitespace, typography hierarchy, metadata line, compact TOC
- Built with CSS Modules (per ADR 0006), not styled-components

#### 2B: Summarize, Chat & Glossary

**User Stories:**
- As a user, I can manually trigger summarization on any bookmark
- As a user, summaries are dual-language: English + Egyptian Arabic side by side
- As a user, I can read articles in a built-in reader mode (clean, distraction-free)
- As a user, I can highlight text in articles and add inline notes
- As a user, I can write standalone notes linked to bookmarks
- As a user, I can chat with AI about a specific article — select text, ask questions, get Egyptian Arabic explanations
- As a user, the AI chat has full article context for better answers
- As a user, technical terms in summaries/articles have hover tooltips with Egyptian Arabic definitions
- As a user, I can save glossary terms to my personal glossary
- As a user, I can browse and search my saved glossary
- As a user, I can export glossary as Markdown/JSON
- As a user, I can choose between cloud LLM (primary) and local LLM (fallback)

**Acceptance Criteria:**
- Summary generation completes in <30s for outer links
- Reader mode renders articles cleanly (Defuddle extraction + Turndown conversion)
- Inline highlights persist across sessions
- AI chat responds in <5s with full article context
- Glossary terms are highlighted and hoverable in summary/reader view
- Glossary is searchable and browsable in a dedicated panel
- Export produces valid Markdown/JSON

**Agent-ready notes:**
- `summarizeBookmark()` must use service-layer abstraction with typed I/O. Writes to `summaries` table. Emits `summary:generated` event.
- `enhanceNote(noteId, selection)` must be a standalone service function. Receives note ID + selected text, returns enhanced text. No UI coupling. Note content is BlockNote blocks stored as JSON string.
- Chat service must expose `sendMessage(sessionId, message, context)` with typed return. Ready for agent to call the same function autonomously.
- Glossary services (`addTerm()`, `searchTerms()`) must be DB-layer only. Agent can call the same functions to auto-populate glossary.

#### 2C: Article Parser — Structured Content Extraction

**User Stories:**
- As a user, articles are automatically parsed when I select a bookmark (one-time)
- As a user, I see a spinner while the article is being parsed
- As a user, parsed articles show structured content: headings, paragraphs, lists, code blocks, blockquotes, images, tables
- As a user, images in articles are rendered inline with lazy loading (not placeholders)
- As a user, tables in articles are rendered as actual table elements (not placeholders)
- As a user, I can collapse/expand the article section
- As a user, threads with outer URLs have the linked article parsed as the article section
- As a user, embedded content (YouTube, CodePen, tweets) are preserved as clickable links
- As a user, I can search within article content via full-text search

**Acceptance Criteria:**
- Defuddle extracts clean article content (no nav, footers, ads, sidebars) in <500ms for most pages
- Turndown converts clean HTML to Markdown with full control over output rules
- `parseMDToBlocks` maps Markdown to BlockNote `PartialBlock[]` blocks
- Gemini fallback activates only when Defuddle fails (paywall, JS-rendered pages)
- Current cheerio parser kept as intermediate fallback between Defuddle and Gemini
- Parsed content stored as `PartialBlock[]` in `article_content.blocks_json`
- Article section shows spinner during auto-parse, renders structured content after
- Images render as `<img>` elements with `loading="lazy"` and alt text
- Tables render as `<table>` elements with proper cell structure
- Inline formatting preserved: bold, italic, code, links
- Code blocks rendered with monospace styling and language detection (` ```language `)
- Blockquotes rendered with indentation and italic styling
- Heading levels preserved (h1-h6, no cap at h3)
- Nested lists rendered with proper indentation
- `<iframe>`/`<video>`/`<audio>` preserved as clickable links (not silently dropped)
- `<figure>`/`<figcaption>` rendered with image + caption
- Collapse/expand toggle persists across sessions
- Thread bookmarks with outer URLs parse the linked article
- Thread bookmarks without outer URLs show no article section
- RTL articles render correctly with proper text direction
- Re-parsing an existing article updates content (upsert, no duplicate rows)
- `parser_version` column tracks which parser version produced the content
- `content_hash` column detects when source HTML has changed
- Full-text search via FTS5 index on `extracted_text` column

**Pipeline:**
```
URL → fetch → HTML string
  → Defuddle (content extraction) → clean HTML + metadata
  → Turndown (HTML→Markdown) → Markdown string
  → parseMDToBlocks → PartialBlock[] (BlockNote format)
  → DB (blocks_json) → ArticleReaderBlock (renders blocks)

Fallback chain:
  1. Defuddle + Turndown + parseMDToBlocks (primary)
  2. Current cheerio parser (if Defuddle fails)
  3. Gemini API (last resort — JS-rendered, paywalled)
```

**Components to build:**
1. `src/parser/extract-content.ts` — Defuddle wrapper (content extraction)
2. `src/parser/local-parser.ts` — rewritten: Defuddle → Turndown → `parseMDToBlocks`
3. `src/parser/gemini-fallback.ts` — Gemini prompt returning structured blocks (last resort)
4. `src/parser/index.ts` — orchestrator: Defuddle → cheerio fallback → Gemini fallback
5. `ArticleReaderBlock` — custom BlockNote block rendering `PartialBlock[]` as styled React (images, tables, TOC)
6. `ArticleReaderBlock.module.css` — reader typography, image/table styles, print CSS

**New dependencies:**
- `defuddle` — article content extraction (by kepano/Obsidian creator)
- `turndown` + `@types/turndown` — HTML→Markdown conversion with custom rules
- `linkedom` — lightweight DOM for Defuddle (preferred over jsdom for Electron)

**Agent-ready notes:**
- Parser service (`parseArticle(url)`) must use service-layer abstraction with typed I/O
- Parsed blocks stored in DB — agent can access structured article content for RAG, chat context
- `getArticleContent()` returns `blocks_json` — agent uses this for article-aware features
- Parser follows ADR-0013 boundaries: typed I/O, no UI coupling, DB as source of truth
- See [ADR-0015](docs/adr/0015-article-parser.md) for full pipeline design and phased implementation

### Phase 3: Search & Sync

**User Stories:**
- As a user, I can perform semantic search ("find bookmarks about database optimization")
- As a user, my data syncs across devices via Supabase
- As a user, vector embeddings are stored locally (libSQL built-in vectors) and in cloud (pgvector)
- As a user, conflict resolution handles concurrent edits gracefully

**Acceptance Criteria:**
- Semantic search returns relevant results in <500ms
- Sync completes in <5s for typical changes
- Offline changes sync when connection restores
- No data loss on conflict

**Agent-ready note:** Search service must expose `semanticSearch(query, filters)` with typed I/O. Agent can use this to proactively surface relevant bookmarks.

### Phase 4: Agent

Agent as orchestrator using LangGraph TypeScript (ReAct loop). Pipeline keeps fetching — agent handles everything else. Ask-first autonomy: agent proposes actions, user approves. Memory stored in SQLite with sqlite-vec for vector embeddings. See [ADR-0014](docs/adr/0014-langgraph-agent-architecture.md).

#### Phase 4A: LangGraph Skeleton + Tool Execution

**User Stories:**
- As a user, the agent can classify and summarize bookmarks using existing AI services
- As a user, the agent runs a ReAct loop (Observe → Think → Act) when triggered
- As a user, the agent is triggered by events (e.g., classification:complete)

**Acceptance Criteria:**
- `@langchain/langgraph` installed and configured
- Flat state schema defined (bookmark, pending actions, user prefs, history, tool results)
- ReAct graph created with Observe → Think → Act nodes
- Existing AI services wired as LangGraph tools (classifyBookmark, summarizeBookmark, enhanceNote, sendMessage)
- Agent can execute tools and return results
- Agent runs inside Electron main process (no separate process)
- Agent triggered by `classification:complete` event

#### Phase 4B: Memory + Embeddings + Preferences

**User Stories:**
- As a user, the agent remembers its decisions and reasoning across sessions
- As a user, the agent recalls similar past situations using semantic search
- As a user, the agent stores learned preferences (e.g., "user approves AI topic summaries")

**Acceptance Criteria:**
- `sqlite-vec` installed and configured
- `agent_memory` table created (id, bookmark_id, context, decision, reasoning, created_at)
- `agent_memory_embeddings` table created (memory_id, embedding BLOB, model_used)
- Three embedding backends implemented: Xenova Transformers (local, 384 dims), Gemini API (cloud, 768 dims), Ollama (cloud models, 768 dims)
- User selects which embedding backend to use in Settings
- Three memory types stored: learned preferences (semantic), episode log (episodic), user profile (facts)
- Agent performs semantic search over memory via sqlite-vec KNN
- `agent_actions` table tracks approved/rejected actions

#### Phase 4C: Approval UI + Desktop Notifications

**User Stories:**
- As a user, I see notification cards when the agent proposes an action
- As a user, I can approve, reject, or modify each proposal
- As a user, I can review all pending proposals in a batch queue
- As a user, I get desktop notifications for new proposals

**Acceptance Criteria:**
- In-app notification card component renders agent proposals
- Batch approval queue shows all pending actions (action type, target bookmark, details)
- Each proposal has Approve / Reject / Modify controls
- Modify flow allows user to adjust proposal (e.g., "summarize but English only")
- Desktop notification fires when new proposal arrives
- Notification badge shows count of pending proposals
- Agent does not execute until user approves
- Agent actions are reversible (user can undo)

#### Phase 4D: Preference Learning + Proactive Suggestions

**User Stories:**
- As a user, the agent learns from my approval patterns
- As a user, the agent auto-proposes similar actions based on what I've approved before
- As a user, the agent surfaces related bookmarks ("this connects to 3 others you've read")
- As a user, the agent proactively suggests actions I actually want

**Acceptance Criteria:**
- Agent stores approval patterns in semantic memory (e.g., "approved summarize for AI topic 5x")
- Agent queries memory before proposing to find similar past decisions
- Agent suggests related bookmarks based on topic/vector similarity
- Agent proactively surfaces high-priority unread bookmarks
- Agent proposes connecting related bookmarks
- ReAct loop uses memory-driven decisions (not just current state)
- Agent emits events that UI subscribes to for real-time updates
- User can configure auto-execute rules for low-risk actions (optional)

## 5. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Desktop Shell | Electron | Matches Obsidian/Codex reference, native Node.js for bird.fast |
| Frontend | React | Largest ecosystem, user familiarity |
| Styling | CSS Modules | Pixel-perfect control for Obsidian-like design |
| Typography | Thmanyah font family | Arabic + Latin in one family, visual consistency |
| RTL | Full RTL layout | UI mirrors for Arabic, mixed text handled correctly |
| i18n | react-intl | RTL/LTR switching, locale management |
| Local DB | @libsql/client (libSQL) | Fast, zero-config, single-file backup, no native build |
| Cloud DB | Supabase (Postgres) | User familiarity, sync enablement |
| Vector (Local) | libSQL built-in vectors | Native to SQLite engine, no extension needed |
| Vector (Cloud) | pgvector (Supabase) | Cloud vector search |
| Job Queue | BullMQ + SQLite | No Redis dependency, sufficient for personal use |
| X Fetcher | bird.fast CLI | Free, cookie-based, near-real-time |
| AI (Primary) | Google Gemini API | Free tier, good Egyptian Arabic quality |
| AI (Fallback) | Ollama (cloud models) | Cloud models via local Ollama runtime |
| Article Reader | defuddle + turndown | Clean article extraction (Defuddle) + HTML→Markdown (Turndown), with Gemini fallback |
| Article Parser | defuddle + turndown + linkedom | Structured HTML → Markdown → BlockNote blocks, hybrid with Gemini fallback |
| Rich Text Editor | @blocknote/react | Notion-style block editor, same as Docmost |
| Agent Framework | @langchain/langgraph | ReAct loop, tool orchestration, state management |
| Vector Search | sqlite-vec | Vector similarity search in SQLite, no external DB |
| Embeddings | @xenova/transformers | Local embedding model (all-MiniLM-L6-v2, 384 dims) |
| Auto-update | electron-updater | Standard Electron update mechanism |

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Electron App                    │
├─────────────┬───────────────────────────────────┤
│  Renderer   │          Main Process             │
│  (React)    │                                   │
│             │  ┌─────────────────────────────┐  │
│  2-Panel   │  │  Job Scheduler (node-cron)  │  │
│  UI         │  │  - Fetch (every 6h)         │  │
│             │  │  - Classify (auto)           │  │
│  Nav Panel  │  │  - Summarize (manual)        │  │
│  (grouped   │  └─────────────┬───────────────┘  │
│   bookmarks │                │                   │
│   + icons)  │  ┌─────────────▼───────────────┐  │
│  Agent UI   │  ┌─────────────▼───────────────┐  │
│  (cards)    │  │  BullMQ + SQLite Queue       │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  bird.fast CLI (child proc)  │  │
│             │  │  → X GraphQL endpoints       │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  LangGraph Agent (ReAct)     │  │
│             │  │  - Observe → Think → Act     │  │
│             │  │  - Tools: classify, summarize│  │
│             │  │  - Memory: sqlite-vec         │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  LLM Service                 │  │
│             │  │  - Gemini (primary)          │  │
│             │  │  - Ollama (fallback)         │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  libSQL (local)              │  │
│             │  │  + sqlite-vec (vectors)      │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  Supabase Sync Layer         │  │
│             │  │  → Postgres + pgvector       │  │
│             │  └─────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 7. Data Model

```sql
-- Core bookmark table
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  tweet_id TEXT UNIQUE,
  url TEXT NOT NULL,
  content_type TEXT CHECK(content_type IN ('outer_link', 'thread', 'x_article', 'video')),
  title TEXT,  -- DEPRECATED: use title_ar / title_en
  title_ar TEXT,
  title_en TEXT,
  author_name TEXT,
  author_handle TEXT,
  tweet_text TEXT,
  fetched_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Classification results
CREATE TABLE classifications (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  priority TEXT CHECK(priority IN ('high', 'medium', 'low')),
  reading_time_min INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Topic tags (hierarchical tree)
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES topics(id),
  created_by TEXT CHECK(created_by IN ('ai', 'user')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, parent_id)
);

-- Hashtags (flat, many-to-many)
CREATE TABLE hashtags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookmark_hashtags (
  bookmark_id TEXT REFERENCES bookmarks(id),
  hashtag_id TEXT REFERENCES hashtags(id),
  PRIMARY KEY (bookmark_id, hashtag_id)
);

-- Bookmark topic assignment (one topic per bookmark)
CREATE TABLE bookmark_topics (
  bookmark_id TEXT REFERENCES bookmarks(id) PRIMARY KEY,
  topic_id TEXT REFERENCES topics(id)
);

-- Phase 2: Summaries (dual-language)
CREATE TABLE summaries (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  model_used TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Phase 2: Reader content
CREATE TABLE article_content (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id) UNIQUE,
  extracted_text TEXT NOT NULL,
  word_count INTEGER,
  blocks_json TEXT,  -- PartialBlock[] JSON for structured rendering (ADR-0015)
  parser_version INTEGER DEFAULT 1,  -- tracks parser version for re-extraction
  content_hash TEXT,  -- SHA-256 of source HTML for change detection
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Phase 2: Highlights & Notes
CREATE TABLE highlights (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  selected_text TEXT NOT NULL,
  note TEXT,
  color TEXT DEFAULT 'yellow',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  title TEXT,
  content TEXT NOT NULL,  -- JSON string of BlockNote blocks: JSON.stringify(blocks)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Phase 2: AI Chat
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES chat_sessions(id),
  role TEXT CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  selected_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Phase 2: Glossary
CREATE TABLE glossary_terms (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  language TEXT DEFAULT 'ar-EG',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookmark_glossary (
  summary_id TEXT REFERENCES summaries(id),
  term_id TEXT REFERENCES glossary_terms(id),
  PRIMARY KEY (summary_id, term_id)
);

-- Phase 4: Agent
CREATE TABLE agent_memory (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  memory_type TEXT CHECK(memory_type IN ('preference', 'episode', 'profile')),
  context TEXT NOT NULL,
  decision TEXT,
  reasoning TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_memory_embeddings (
  memory_id TEXT REFERENCES agent_memory(id) PRIMARY KEY,
  embedding BLOB NOT NULL,
  model_used TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  target TEXT NOT NULL,
  payload TEXT,
  result TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'modified', 'executed', 'rolled_back')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Import pipeline batch tracking
CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  status TEXT CHECK(status IN ('running', 'paused', 'completed', 'failed')),
  cursor TEXT,
  total_fetched INTEGER DEFAULT 0,
  total_classified INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME
);
```

## 8. Key Decisions (ADRs)

- [0001: bird.fast as X Fetcher](docs/adr/0001-bird-fast-x-fetcher.md)
- [0002: SQLite + Supabase Storage](docs/adr/0002-sqlite-plus-supabase-storage.md)
- [0003: Electron + React Desktop](docs/adr/0003-electron-react-desktop.md)
- [0004: BullMQ + SQLite Job Queue](docs/adr/0004-bullmq-sqlite-job-queue.md)
- [0005: Cloud AI + Local Fallback](docs/adr/0005-cloud-ai-local-fallback-llm.md)
- [0011: @libsql/client as Local SQLite Driver](docs/adr/0011-libsql-client-local-sqlite.md)
- [0012: BookmarkDetail Page Architecture](docs/adr/0012-bookmarkdetail-page-architecture.md)
- [0013: Agent-Ready AI Boundaries](docs/adr/0013-agent-ready-ai-boundaries.md)
- [0014: LangGraph Agent Architecture](docs/adr/0014-langgraph-agent-architecture.md)
- [0015: Article Parser — Structured Content Extraction](docs/adr/0015-article-parser.md)
- [0016: User Config & Authentication](docs/adr/0016-user-config-auth.md)
- [0017: Two-Panel Layout Redesign](docs/adr/0017-two-panel-layout-redesign.md)
- [0018: Internationalization & Bidirectional Layout](docs/adr/0018-i18n-bidirectional-layout.md)
- [0019: Topic & Hashtag Data Model](docs/adr/0019-topic-hashtag-model.md)
- [0020: Batch Import Pipeline](docs/adr/0020-batch-import-pipeline.md)
- [0021: Split View Multi-Column](docs/adr/0021-split-view-multi-column.md)

## 9. Success Metrics

- **Bookmark processing rate**: >90% of new bookmarks classified within 1 hour of saving
- **Classification accuracy**: >80% agreement with manual priority assignment
- **Summary quality**: User satisfaction >4/5 on Arabic summary quality
- **Glossary coverage**: >70% of technical terms in summaries have glossary entries
- **App responsiveness**: <100ms UI interactions, <30s summary generation

## 10. Resolved Decisions

- **Styling**: CSS Modules — pixel-perfect control for Obsidian-like design
- **LLM**: Google Gemini API (primary) + Ollama (fallback) — $0 cost
- **Auto-update**: electron-updater — standard Electron update mechanism
- **Data export**: JSON + Markdown export + full SQLite backup
- **Mobile**: PWA first (quick access), React Native later (full features)
- **BookmarkDetail**: Obsidian-style page with Outline visual language — built from scratch, no Outline code fork
- **Notes Editor**: BlockNote (`@blocknote/react`) — Notion-style block editor, same as Docmost uses. No custom textarea. Store as JSON string in DB, parse on load. Props change from `(content: string, onChange: (s: string) => void)` to `(initialContent: string, onChange: (blocks: Block[]) => void)`.
- **Page layout**: Horizontal tabs for multiple bookmarks, ContentsBar aligned with app title, single scrollable page, three layout modes (linear/two-column/collapsible)
- **App layout**: Two-panel RTL — nav panel (350px, right) with grouped bookmarks + action icons, detail panel (flex: 1, center). NavPanel collapses to vertical icon strip. Center panel supports 2-3 column split view. Sidebar removed. See [ADR-0017](docs/adr/0017-two-panel-layout-redesign.md) and [ADR-0021](docs/adr/0021-split-view-multi-column.md).
- **Section ownership**: Agent owns Summary/Glossary/Chat; User owns Highlights/Notes; Glossary is shared
- **Enhance**: Selection-based — user selects text in notes, floating toolbar offers "Enhance" button
- **Reference links**: Hover-to-copy sentence-level references from agent sections into user notes
- **Theme**: Dual theme (dark + light) with Obsidian CSS custom properties
- **Empty sections**: Hidden when no content exists
- **Agent boundary**: AI services use service-layer abstraction with typed I/O, event emission, no UI coupling. Ready for future agent to call same functions autonomously.
- **Article parser**: Hybrid pipeline — Defuddle (content extraction) + Turndown (HTML→Markdown) + `parseMDToBlocks` (Markdown→BlockNote). Gemini as last-resort fallback. Images as `<img>` elements with lazy loading. Tables as `<table>` elements. Code blocks with language detection. Custom Turndown rules for `<iframe>`, `<video>`, `<audio>`. Current cheerio parser kept as intermediate fallback. See [ADR-0015](docs/adr/0015-article-parser.md).
- **User config**: Single-user app. Flat JSON config file (`user.json`) in userData dir (`~/.config/bookmarkX/`). Stores identity (name, Twitter handle), auth tokens (Gemini API key, bird auth), and preferences (theme, language, notifications, fetch frequency, AI model). Replaces `.env` file entirely. See [ADR-0016](docs/adr/0016-user-config-auth.md).
- **Chrome profile detection**: Linux-only auto-detection. Scans `~/.config/google-chrome/` for profiles, extracts `auth_token` and `ct0` from Chrome's unencrypted SQLite cookie DB. Fills settings automatically.
- **Twitter login**: Electron BrowserWindow approach. Opens `x.com/login` in a session-partitioned window, captures cookies after login. Equal option alongside manual token entry.
- **First-run experience**: App works immediately with empty config. Subtle prompt banner guides user to complete setup in Settings.
- **Settings UI**: Profile section in Settings modal (not sidebar). Two equal auth options: "Login with Twitter" button + manual token entry. Auto-detect button for Chrome profile.
- **i18n architecture**: Separate JSON translation files (`locales/ar.json`, `locales/en.json`). All hardcoded strings converted to `intl.formatMessage()`. CSS uses logical properties. Locale state in React context + user.json. Language change triggers app restart with prompt. Bookmark titles stored as dual columns (`title_ar`, `title_en`) with fallback. NavPanel and layout mirror with language. See [ADR-0018](docs/adr/0018-i18n-bidirectional-layout.md).
- **Topic/Hashtag model**: One hierarchical topic tree + many flat hashtags per bookmark. Topics are tree-structured (parent_id), both AI and user can create, moving = reparent. Hashtags are flat tags, many-to-many. See [ADR-0019](docs/adr/0019-topic-hashtag-model.md).
- **Import pipeline**: Batch processing for hundreds of Twitter bookmarks. Fetch paginated (cursor-based) → Clean (dedup URLs, filter retweets/likes) → Enrich (local parser, no AI tokens) → Classify (batched 10-20). Pause/resume support. See [ADR-0020](docs/adr/0020-batch-import-pipeline.md).
- **Split view**: Center panel splits into 2-3 vertical columns, each with own BookmarkTab bar. Resizable dividers (300px min). Triggers: drag-to-edge, split button on tab hover, right-click menu. Only active column shows Contents sidebar. See [ADR-0021](docs/adr/0021-split-view-multi-column.md).
- **BookmarkDetail as continuous doc**: Single BlockNote document for all sections. Article collapsible with no borders. Text selectable across sections for chat. Custom named sections per-bookmark (insert before/between/after fixed sections).
- **BlockNote fonts**: English uses Shantell Sans (Google Fonts CDN), Arabic uses Playpen Sans Arabic (Google Fonts CDN). Applied only inside BlockNote via `.bn-editor` CSS override. Rest of app keeps Thmanyah.
- **Contents bar**: Vertical minimap that mirrors NavPanel position (left in Arabic, right in English). Visual inverse color scheme vs NavPanel.
- **NavPanel collapse**: Collapses to vertical icon strip, expands on hover/toggle. Username + profile image from X/Twitter auth above icon strip.
- **BookmarkTab context menu**: Right-click with Close, Close All, Close to Right, Close to Left, Close All But This, Open in New Column, Reopen Closed Tab. Closed tabs tracked in a stack.
- **App lang forces everything**: Group names, bookmark titles, tabs, all chrome forced to app language direction. No mixed-direction text in NavPanel or BookmarkTabs.
- **Settings RTL**: Fix scrollbar clipping at rounded corners, RTL alignment for form elements.
- **Notifications**: Agent proposals + status updates combined in one notification system. Fix broken button UI, implement backend.
- **parsingArticle RTL**: Container needs `dir="rtl"` in Arabic mode.

## 11. Open Questions

- [ ] Electron auto-update code signing (for production releases)
- [ ] Supabase project setup and schema migration strategy
- [x] bird.fast cookie refresh strategy — solved via Chrome auto-detect + Twitter login (Phase 0)
- [x] Settings storage format — solved: user.json replaces .env (ADR-0016)
- [x] User account model — solved: single-user, config file approach (ADR-0016)
- [ ] Chrome profile detection for macOS/Windows (encrypted cookies — needs keytar)
- [x] Language support: English UI alongside Arabic (LTR mode) — solved: separate JSON files, logical CSS, React-managed direction, app restart on language change (Phase 0.5)
- [x] Notes editor: BlockNote (`@blocknote/react`) — decided, same as Docmost

## 12. Agent-Ready Architecture

The app currently uses **AI** (stateless LLM calls) but is designed to evolve into an **Agent** (autonomous entity with tool access and UI control). All AI-related code must follow agent-ready boundaries.

### Current AI → Future Agent Boundary

| Concern | AI (now) | Agent (future) |
|---------|----------|----------------|
| Invocation | User-triggered (button press) | Autonomous (proactive) |
| Memory | None (stateless calls) | Conversation + app state |
| Tool use | None | Read/write DB, trigger pipelines, control UI |
| UI coupling | AI logic in service layer, UI renders results | Agent can push to UI sections directly |
| Decision making | Single-response | Multi-step reasoning, planning |

### Agent-Ready Design Rules

1. **Service-layer abstraction**: All AI calls go through service functions (e.g., `classifyBookmark()`, `summarizeBookmark()`, `enhanceNote()`). Never call LLM APIs directly from UI components.
2. **Clear I/O types**: Every AI service function has typed input/output. No implicit dependencies on UI state.
3. **No UI coupling in AI logic**: AI services never import React components or DOM APIs. They receive data, return data.
4. **Event emission**: AI services emit events (e.g., `summary:generated`, `classification:complete`) that the UI subscribes to. Agent can emit the same events to drive UI updates.
5. **Database as source of truth**: AI writes results to DB. UI reads from DB. Agent reads/writes the same DB tables. No in-memory-only state for AI results.
6. **Reversibility**: Every AI write operation can be rolled back or overwritten by the user or agent.

### Agent-Ready Code Patterns

```
// GOOD: Service layer abstraction
async function summarizeBookmark(bookmarkId: string): Promise<Summary> {
  const bookmark = await db.getBookmark(bookmarkId);
  const result = await llm.summarize(bookmark.content);
  await db.saveSummary(bookmarkId, result);
  eventEmitter.emit('summary:generated', { bookmarkId, summary: result });
  return result;
}

// BAD: AI logic in UI component
async function handleSummarize() {
  const response = await fetch('/api/summarize', { ... }); // ❌ No service layer
  setSummary(response.data); // ❌ UI-coupled state
}
```

### Database Additions for Agent

```sql
-- Agent memory (future)
CREATE TABLE agent_memory (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  context TEXT NOT NULL,
  decision TEXT,
  reasoning TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent actions log (future)
CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  target TEXT NOT NULL,
  payload TEXT,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Path

1. **Phase 1-2 (now)**: Build AI services with typed I/O, service-layer abstraction, event emission. All AI results write to DB.
2. **Phase 3 (future)**: Add agent memory table, agent actions log. Agent calls same service functions. Add proactive triggers (e.g., agent auto-summarizes high-priority bookmarks).
3. **Phase 4 (future)**: Agent gains UI control — can update BookmarkDetail sections, suggest actions, surface insights proactively.

## 13. Design References

| File | Purpose | Link |
|------|---------|------|
| Oreo UI Library | Agentic UI components, design tokens | [Figma](https://www.figma.com/design/kHZFqc4N3cnWjlNofF62Z4) |
| Obsidian Design System | Desktop/Mobile layout, component patterns | [Figma](https://www.figma.com/design/laS0wQy1FZ8xecZfQEMcGm) |

### Key Components to Reference
- **Oreo**: Color tokens (Light/Dark), Typography, Button, Chip, Tag, Sidebar, Navbar
- **Obsidian**: Cards, Tags, List Items, Input Fields, Window frames, Tab bar, Desktop wireframes

### Obsidian Desktop Layout Pattern
```
┌─────────────────────────────────────────────────────────┐
│ Titlebar (custom or native)                             │
├──────────┬──────────────────────────────────────────────┤
│          │ Tab Bar (file tabs)                          │
│  Left    ├──────────────────────────────────────────────┤
│  Ribbon  │                                              │
│  (icons) │ Workspace Leaf (split panes)                 │
│          │  ┌─────────────┬──────────────────────────┐  │
│          │  │ Nav Header  │ Content Area             │  │
│          │  │ (file tree) │                          │  │
│          │  │             │                          │  │
│          │  └─────────────┴──────────────────────────┘  │
├──────────┴──────────────────────────────────────────────┤
│ Status Bar                                              │
└─────────────────────────────────────────────────────────┘
```

### Obsidian CSS Variables (Reference)
```css
--background-primary
--background-secondary
--background-modifier-border
--background-modifier-form-field
--text-normal
--interactive-normal
--input-shadow
--modal-background, --modal-radius
--radius-s, --radius-m, --radius-l, --radius-xl
--toggle-radius, --toggle-width, --toggle-thumb-height
--font-ui-small
```
