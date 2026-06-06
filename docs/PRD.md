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

### Phase 1: MVP — Fetch & Classify

**User Stories:**
- As a user, I can connect my X account via bird.fast cookie auth
- As a user, bookmarks are fetched automatically every 6 hours (configurable)
- As a user, I can manually trigger a fetch at any time (resets the 6-hour timer)
- As a user, each bookmark is auto-classified with: Priority (high/medium/low), Topic tags, Reading time estimate
- As a user, I can browse bookmarks in a 3-column layout (sidebar + list + detail)
- As a user, I can filter by priority, topic, and content type
- As a user, I can search bookmarks by keyword (full-text)
- As a user, I get desktop notifications + in-app badge for high-priority new bookmarks
- As a user, the app works offline with previously fetched data
- As a user, I can configure API keys and auth tokens from the Settings screen

**Acceptance Criteria:**
- bird.fast CLI is bundled or accessible from the Electron app
- Classification uses <1s per bookmark (cheap AI call on metadata only)
- 3-column layout renders in <100ms
- Offline mode shows cached bookmarks
- Full RTL layout: sidebar, navigation, and content areas mirror for Arabic text
- Mixed Arabic/English text renders correctly (bidirectional text support)
- Thmanyah font family loaded and applied to Arabic text
- Settings screen allows updating: GEMINI_API_KEY, BIRD_AUTH_TOKEN, BIRD_CT0, BIRD_CHROME_PROFILE
- Settings persist to .env file and are loaded on app start
- Sensitive values (API keys, tokens) are masked in the UI

**Agent-ready note:** Classification service (`classifyBookmark()`) must use service-layer abstraction with typed I/O and event emission. No UI coupling. Ready for future agent invocation.

### Phase 2: BookmarkDetail Page + Summarize, Chat & Glossary

Phase 2 delivers the core reading/annotation view AND the AI features that live inside it. The BookmarkDetail page is redesigned from a flat info panel into an Obsidian-style document page with Outline's visual language.

#### 2A: BookmarkDetail Page Architecture

The BookmarkDetail is an Obsidian-style single scrollable page with a Contents sidebar. Built from scratch with lightweight React components + CSS Modules. No Outline code dependency.

**Page Anatomy (top to bottom):**

```
┌──────────────────────────────────────────────────────────┐
│ [Contents Sidebar]  │  Page Header                       │
│  (compact minimap)  │  ─────────────────────────────     │
│                     │  Title (large, bold)               │
│  ─ dash             │  Metadata line (topic · priority   │
│  ─ dash             │  · reading time · updated X ago)   │
│  ─ dash             │                                    │
│  ─ dash             │  ┌─ Summary (agent) ────────────┐  │
│  ─ dash             │  │  Dual-language summary        │  │
│  ─ dash             │  └──────────────────────────────┘  │
│  (hover → titles)   │                                    │
│                     │  ┌─ Glossary (agent + user) ────┐  │
│                     │  │  Term definitions, user can   │  │
│                     │  │  add custom terms             │  │
│                     │  └──────────────────────────────┘  │
│                     │                                    │
│                     │  ┌─ Article (collapsible) ──────┐  │
│                     │  │  Readability.js extracted     │  │
│                     │  │  content, expand/collapse     │  │
│                     │  └──────────────────────────────┘  │
│                     │                                    │
│                     │  ┌─ Highlights (user) ──────────┐  │
│                     │  │  Selected text with notes     │  │
│                     │  └──────────────────────────────┘  │
│                     │                                    │
│                     │  ┌─ Notes (user) ───────────────┐  │
│                     │  │  User-written notes           │  │
│                     │  │  [Enhance] on selection       │  │
│                     │  └──────────────────────────────┘  │
│                     │                                    │
│                     │  ┌─ Chat (agent) ───────────────┐  │
│                     │  │  Inline AI conversation       │  │
│                     │  │  with article context         │  │
│                     │  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Section ownership:**
| Section | Owner | Can edit? |
|---------|-------|-----------|
| Summary | Agent | Agent writes, user cannot edit |
| Glossary | Agent + User | Agent generates, user can add terms |
| Article | System | Readability.js extraction, read-only |
| Highlights | User | User selects text, adds notes |
| Notes | User | User writes, agent can enhance |
| Chat | Agent + User | User asks, agent responds |

**Layout options (user-switchable):**
1. **Linear** (default) — single column, sections flow top to bottom
2. **Two-column** — agent content on left, user content on right
3. **Collapsible** — sections can be collapsed/expanded

**Key interactions:**
- **Contents sidebar**: Compact minimap with dashes; hover reveals section titles; click to jump
- **Enhance**: User selects text in their notes → floating toolbar → "Enhance" button → agent improves selection without rewriting
- **Reference links**: User hovers over any sentence in an agent section → link icon appears → click to copy reference → paste in notes → renders as clickable chip → jumps to that sentence
- **Empty sections**: Hidden entirely when no content exists
- **Article**: Inline but collapsible — user can expand to read full article, collapse to focus on summary/notes

**Components to build:**
1. `ContentsSidebar` — compact minimap (~100 lines)
2. `PageHeader` — title + metadata line (~80 lines)
3. `SectionRenderer` — renders each section type (custom)
4. `ArticleView` — readability.js content, collapsible (custom)
5. `NotesEditor` — simple rich text for user notes (Tiptap or contentEditable)
6. `ChatPanel` — inline chat UI (custom)
7. `ReferenceChip` — inline reference link chip (custom)
8. `EnhanceToolbar` — floating toolbar on text selection (custom)

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
- Reader mode renders articles cleanly (readability.js or similar)
- Inline highlights persist across sessions
- AI chat responds in <5s with full article context
- Glossary terms are highlighted and hoverable in summary/reader view
- Glossary is searchable and browsable in a dedicated panel
- Export produces valid Markdown/JSON

**Agent-ready notes:**
- `summarizeBookmark()` must use service-layer abstraction with typed I/O. Writes to `summaries` table. Emits `summary:generated` event.
- `enhanceNote(noteId, selection)` must be a standalone service function. Receives note ID + selected text, returns enhanced text. No UI coupling.
- Chat service must expose `sendMessage(sessionId, message, context)` with typed return. Ready for agent to call the same function autonomously.
- Glossary services (`addTerm()`, `searchTerms()`) must be DB-layer only. Agent can call the same functions to auto-populate glossary.

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

### Phase 4: Agent (Future)

**User Stories:**
- As a user, the agent proactively surfaces high-priority bookmarks I haven't read
- As a user, the agent auto-summarizes new bookmarks without manual trigger
- As a user, the agent suggests actions (e.g., "this bookmark relates to 3 others you've read")
- As a user, the agent can update BookmarkDetail sections (push summaries, suggest notes)
- As a user, the agent has conversation memory across sessions
- As a user, the agent logs its decisions and reasoning for transparency

**Acceptance Criteria:**
- Agent calls existing service functions (same as Phase 1-2 AI services)
- Agent writes to `agent_memory` and `agent_actions` tables
- Agent emits events that UI subscribes to for real-time updates
- User can review/override any agent action
- Agent decisions are reversible

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
| AI (Fallback) | Ollama (cloud + local) | Offline/budget, cloud models available |
| Article Reader | readability.js | Clean article extraction for reader mode |
| Auto-update | electron-updater | Standard Electron update mechanism |

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Electron App                    │
├─────────────┬───────────────────────────────────┤
│  Renderer   │          Main Process             │
│  (React)    │                                   │
│             │  ┌─────────────────────────────┐  │
│  3-Column   │  │  Job Scheduler (node-cron)  │  │
│  UI         │  │  - Fetch (every 6h)         │  │
│             │  │  - Classify (auto)           │  │
│  Filters    │  │  - Summarize (manual)        │  │
│  Search     │  └─────────────┬───────────────┘  │
│  Glossary   │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  BullMQ + SQLite Queue       │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  bird.fast CLI (child proc)  │  │
│             │  │  → X GraphQL endpoints       │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  LLM Service                 │  │
│             │  │  - GPT-4o / Claude (primary) │  │
│             │  │  - Ollama (fallback)         │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  libSQL (local)              │  │
│             │  │  + built-in vectors          │  │
│             │  └─────────────┬───────────────┘  │
│             │                │                   │
│             │  ┌─────────────▼───────────────┐  │
│             │  │  Supabase Sync Layer         │  │
│             │  │  → Postgres + pgvector       │  │
│             │  └─────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 7. Data Model (Phase 1)

```sql
-- Core bookmark table
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  tweet_id TEXT UNIQUE,
  url TEXT NOT NULL,
  content_type TEXT CHECK(content_type IN ('outer_link', 'thread', 'x_article', 'video')),
  title TEXT,
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

-- Topic tags (many-to-many)
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE bookmark_topics (
  bookmark_id TEXT REFERENCES bookmarks(id),
  topic_id TEXT REFERENCES topics(id),
  PRIMARY KEY (bookmark_id, topic_id)
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
  extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  content TEXT NOT NULL,
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

-- Phase 4: Agent (future)
CREATE TABLE agent_memory (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT REFERENCES bookmarks(id),
  context TEXT NOT NULL,
  decision TEXT,
  reasoning TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  target TEXT NOT NULL,
  payload TEXT,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
- **Page layout**: Single scrollable page with Contents sidebar (compact minimap), three layout modes (linear/two-column/collapsible)
- **Section ownership**: Agent owns Summary/Glossary/Chat; User owns Highlights/Notes; Glossary is shared
- **Enhance**: Selection-based — user selects text in notes, floating toolbar offers "Enhance" button
- **Reference links**: Hover-to-copy sentence-level references from agent sections into user notes
- **Theme**: Dual theme (dark + light) with Obsidian CSS custom properties
- **Empty sections**: Hidden when no content exists
- **Agent boundary**: AI services use service-layer abstraction with typed I/O, event emission, no UI coupling. Ready for future agent to call same functions autonomously.

## 11. Open Questions

- [ ] Electron auto-update code signing (for production releases)
- [ ] Supabase project setup and schema migration strategy
- [ ] bird.fast cookie refresh strategy (cookies expire)

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
