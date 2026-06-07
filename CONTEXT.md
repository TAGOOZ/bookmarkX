# BookmarkX

A personal knowledge management tool that solves "bookmark FOMO" by automatically fetching, classifying, and summarizing saved links from X/Twitter, with AI-generated Egyptian Arabic summaries and contextual glossaries.

## Agent vs AI

**AI (current, Phase 1-2)**:
Stateless, request-response calls to LLM APIs (Gemini, Ollama). Each call is independent — no memory, no tool use, no UI control. Used for: classify, summarize, chat, enhance.
_Autonomous_: no. The AI only responds when invoked.

**Agent (future, Phase 3+)**:
An autonomous entity that can control app UI, trigger multi-step workflows, make decisions, and act on behalf of the user. The agent has memory, tool access (read/write DB, trigger pipelines, control BookmarkDetail sections), and can proactively surface insights.
_Autonomous_: yes. The agent initiates actions.

**Agent boundary**:
The interface between current AI and future agent. All AI-related code must be built with agent-ready boundaries: clear input/output types, no UI coupling in AI logic, service-layer abstraction. When the agent arrives, it calls the same services the AI does — just with autonomy and memory on top.

**Agent Orchestrator**:
The agent's role as the central coordinator that manages the knowledge lifecycle. The agent orchestrates classify, summarize, connect, and suggest actions. The triage pipeline keeps fetching — the agent does everything else.
_Avoid_: brain, controller

**ReAct Loop**:
The agent's decision-making pattern: Observe (check state, new bookmarks) → Think (decide what to do) → Act (call a tool) → Observe (check result) → Think... until done. Chosen over linear pipeline or branching graph for maximum flexibility.
_Avoid_: agent loop, action loop

**Agent Tools**:
Functions the agent can call during its ReAct loop. Three categories: (1) Existing AI services (classifyBookmark, summarizeBookmark, enhanceNote, sendMessage), (2) Notifications/UI (propose actions to user), (3) Search/discovery (find related bookmarks, query glossary). Agent never accesses DB directly — goes through service functions per ADR-0013.
_Avoid_: agent capabilities, agent functions

**Agent Proposal**:
An action the agent suggests to the user for approval. Rendered as an in-app notification card. User can approve, reject, or modify each proposal. Batch queue shows all pending proposals. Agent does not execute until user approves.
_Avoid_: agent action, agent suggestion

**Agent Memory**:
Persistent state the agent retains across sessions. Three types: (1) Learned preferences (semantic) — e.g., "user always approves AI topic summaries", (2) Episode log (episodic) — e.g., "last Tuesday summarized 3 ML bookmarks", (3) User profile (facts) — e.g., "prefers Egyptian Arabic summaries". Stored in SQLite with sqlite-vec for vector-enhanced semantic recall.
_Avoid_: agent state, agent context

**Embedding Backend**:
The service used to generate vector embeddings for agent memory search. Three supported backends: (1) Xenova Transformers (local, all-MiniLM-L6-v2, 384 dims), (2) Gemini API (cloud, 768 dims), (3) Ollama (cloud models via local Ollama runtime, 768 dims). User selects which backend to use.
_Avoid_: embedding model, vector provider

## Language

**Bookmark**:
A saved link from X/Twitter — can be an outer link, thread, or X article.
_Avoid_: save, link, post

**Fetch**:
The act of retrieving bookmark metadata from X via bird.fast CLI.
_Avoid_: scrape, pull, sync

**Topic**:
A hierarchical grouping label (tree structure). A bookmark belongs to exactly ONE topic — its parent in the tree. Both AI (during classify) and user can create topics. Moving a bookmark between topics reparents it. Topics appear as collapsible groups in the NavPanel.
_Avoid_: category, group, folder

**Hashtag**:
A flat, non-hierarchical tag. A bookmark can have multiple hashtags. Hashtags are independent of topic assignment — a bookmark can be in one topic but tagged with many hashtags. Created by user or AI.
_Avoid_: tag, label

**Classify**:
An AI-powered cheap pass that assigns priority (high/medium/low), topic (one), hashtags (many), and reading time estimate to a bookmark using only metadata/tweet text.
_Avoid_: tag, categorize, rank

**Summarize**:
An expensive AI pass that extracts full article content and generates a dual-language summary (English + Egyptian Arabic) with a contextual glossary. Triggered manually by the user.
_Avoid_: translate, explain

**Glossary**:
A set of Egyptian Arabic definitions for technical terms found in a summarized bookmark. Stored in-app, searchable and browsable.
_Avoid_: dictionary, terminology

**Priority**:
A classification label — high, medium, or low — indicating how important a bookmark is to read.
_Avoid_: importance, ranking

**Triage Pipeline**:
The three-stage processing flow: Fetch (metadata) → Classify (cheap AI) → Summarize (expensive AI, manual trigger).
_Avoid_: workflow, pipeline

**Import Pipeline**:
A batch processing flow for importing hundreds of Twitter bookmarks: Fetch (paginated, batched) → Clean (dedup + filter retweets/likes) → Enrich (AI-powered domain/read-time extraction) → Classify (batched). Runs incrementally to avoid token burn. Bookmarks are importable before classification — user can browse metadata immediately.
_Avoid_: bulk import, batch sync

**Outer Link**:
A URL shared in a tweet that links to external content (blog post, article, docs).
_Avoid_: external link, reference

**X Article**:
A long-form post published directly on X/Twitter (not a thread).
_Avoid_: long tweet, X post

**Thread**:
A sequence of connected tweets from one author, telling a story or explaining a concept.
_Avoid_: tweet thread, chain

**Bookmark Detail Page**:
The main content view for a selected bookmark. A single continuous BlockNote document containing all sections (Summary → Glossary → Article → Highlights → Notes → Chat) in one scrollable editor. Article section is collapsible with no visible borders — seamless integration, not a separate panel. Text can be selected across sections for mentioning in chat or asking about. Has a compact Contents sidebar (dash minimap, hover to reveal titles). Agent owns summary/glossary/chat; user owns notes. Supports split view — the center panel can split into 2-3 vertical columns, each showing a different bookmark with its own tab bar.
_Avoid_: detail view, detail panel

**Split View**:
A layout mode where the BookmarkDetail center panel splits into 2-3 vertical columns. Each column has its own BookmarkTab bar and shows a different bookmark. Triggered by drag-to-edge, split button on tab hover, or right-click context menu. Columns are resizable with 300px minimum width. Only the active/focused column shows the Contents sidebar.
_Avoid_: multi-panel, side-by-side

**BookmarkTab Context Menu**:
Right-click menu on BookmarkTabs with: Close, Close All, Close to Right, Close to Left, Close All But This, separator, Open in New Column, Reopen Closed Tab. Standard browser-style tab management plus split view trigger. Closed tabs are tracked in a stack for reopen.
_Avoid_: tab menu, tab context menu

**NavPanel**:
The right-side navigation panel (RTL) containing grouped bookmarks, action icons, and user identity. Structure: username + profile image at top, then search/settings icons, then grouped bookmark list. Position mirrors with locale (right in Arabic, left in English). Can collapse to a vertical icon strip (icons only, no bookmark list) — expands on hover or toggle.
_Avoid_: sidebar, bookmark list panel

**Contents Sidebar**:
A compact minimap that mirrors the NavPanel position based on locale (Arabic → left, English → right). Shows small vertical dashes for each section; hovering reveals section titles. Clicking jumps to that section. Has a visual inverse color scheme compared to the NavPanel (light bar on dark panel or vice versa).
_Avoid_: TOC sidebar, table of contents panel

**Agent Section**:
A section of the Bookmark Detail Page written by the AI agent: Summary, Glossary, Chat. The agent owns these; user cannot edit them directly.
_Avoid_: ai section, generated section

**User Section**:
A section of the Bookmark Detail Page written by the user: Highlights, Notes. The agent can enhance user notes on request but never overwrites them. Users can also create additional named sections (per-bookmark) and place them before, between, or after the fixed sections.
_Avoid_: user content, manual section

**Enhance**:
An action the user triggers on their notes to have the AI agent improve/expand them without rewriting from scratch.
_Avoid_: improve, rewrite, AI edit

**Reference Link**:
An inline link from a user note to a specific part of an agent section (e.g., "see summary about X"). Rendered as a clickable chip that jumps to that section.
_Avoid_: cross-reference, backlink

## i18n

**Locale**:
The active UI language setting (Arabic or English). Stored in `user.json`, managed via React context. Drives layout direction and all UI text.
_Avoid_: language setting, lang preference

**App Chrome**:
All non-content UI elements: labels, headings, buttons, navigation, tabs, titlebar. These follow the locale. Content (bookmark titles, editor) is handled separately.
_Avoid_: UI, interface

**Dual Titles**:
Bookmarks store two title columns: `title_ar` and `title_en`. The displayed title follows the current locale, falling back to the other language if the preferred one is NULL. The entire panel (group names, bookmark titles, tabs, all chrome) is forced to the app language direction — no mixed-direction text in NavPanel or BookmarkTabs.
_Avoid_: translated title, alternate title

## Editor Decision

**BlockNote** (`@blocknote/react`, `@blocknote/core`, `@blocknote/mantine`) — Notion-style block editor, same as Docmost. Replaces the plain textarea in NotesEditor. Store content as JSON string in DB (`JSON.stringify(blocks)`). Props change from `(content: string, onChange: (s: string) => void)` to `(initialContent: string, onChange: (blocks: Block[]) => void)`.

**BlockNote Fonts**:
English text inside BlockNote editor uses Shantell Sans (Google Fonts CDN) — the hand-drawn style font from tldraw. Arabic text inside BlockNote uses Playpen Sans Arabic (Google Fonts CDN). Fonts loaded via `@import` in CSS and applied to BlockNote editor via `.bn-editor` CSS override only — rest of the app keeps Thmanyah font family.
_Avoid_: editor fonts, blocknote fonts
