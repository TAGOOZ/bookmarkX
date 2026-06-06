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

**Classify**:
An AI-powered cheap pass that assigns priority (high/medium/low), topic tags, and reading time estimate to a bookmark using only metadata/tweet text.
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
The main content view for a selected bookmark. An Obsidian-style single scrollable page with sections: Summary → Glossary → Article (collapsible) → Highlights → Notes → Chat. Has a compact Contents sidebar (dash minimap, hover to reveal titles). Agent owns summary/glossary/chat; user owns notes.
_Avoid_: detail view, detail panel

**Contents Sidebar**:
A compact minimap on the left of the Bookmark Detail Page. Shows small dashes/lines for each section; hovering reveals section titles. Clicking jumps to that section.
_Avoid_: TOC sidebar, table of contents panel

**Agent Section**:
A section of the Bookmark Detail Page written by the AI agent: Summary, Glossary, Chat. The agent owns these; user cannot edit them directly.
_Avoid_: ai section, generated section

**User Section**:
A section of the Bookmark Detail Page written by the user: Highlights, Notes. The agent can enhance user notes on request but never overwrites them.
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
Bookmarks store two title columns: `title_ar` and `title_en`. The displayed title follows the current locale, falling back to the other language if the preferred one is NULL.
_Avoid_: translated title, alternate title

## Editor Decision

**BlockNote** (`@blocknote/react`, `@blocknote/core`, `@blocknote/mantine`) — Notion-style block editor, same as Docmost. Replaces the plain textarea in NotesEditor. Store content as JSON string in DB (`JSON.stringify(blocks)`). Props change from `(content: string, onChange: (s: string) => void)` to `(initialContent: string, onChange: (blocks: Block[]) => void)`.
