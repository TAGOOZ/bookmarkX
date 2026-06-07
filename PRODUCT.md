# Product

## Register

product

## Users

Primary: Arabic-speaking developer managing X/Twitter bookmarks. Uses the app daily to triage saved links, read AI-generated Egyptian Arabic summaries, and build a personal glossary of technical terms. Context: desktop, focused reading, often late-night or commute catch-up sessions.

Future: Other Arabic-speaking developers/tech workers who bookmark English content and want actionable summaries without reading every link.

## Product Purpose

BookmarkX solves "bookmark FOMO" — the anxiety of saving links you never read. It automatically fetches X/Twitter bookmarks, classifies them by priority and topic using AI, and provides on-demand Egyptian Arabic summaries with contextual glossaries. The goal: every bookmark becomes immediately actionable, not a guilt trip.

## Brand Personality

Focused, legible, unhurried. Think Obsidian meets a well-organized Arabic library. The interface should disappear into the task — reading, triaging, note-taking — not demand attention for itself. Voice: calm competence, not startup enthusiasm.

## Anti-references

- **AI SaaS cream aesthetic**: Warm beige/sand/paper backgrounds. The whole OKLCH L 0.84-0.97, C < 0.06 band. This app is dark-first.
- **Gradient text**: `background-clip: text` on headings. Decorative, never meaningful.
- **Glassmorphism**: Blurs and frosted glass used decoratively. Rare and purposeful, or nothing.
- **Side-stripe borders**: `border-left: 3px solid` as colored accent on cards/sections. Never intentional.
- **Tiny uppercase tracked eyebrows on every section**: "SUMMARY" "GLOSSARY" "CHAT" in small caps above each section. AI grammar, not voice.
- **Card grids with icon + heading + text**: The generic SaaS feature grid.
- **Marketing buzzwords**: streamline, empower, supercharge, seamless, world-class, next-generation.
- **Bounce/elastic easing**: Motion should convey state, not perform.

## Design Principles

1. **Task-first, not chrome-first**: Every component earns its presence by serving the reading/triaging workflow. Remove anything that doesn't help the user act on a bookmark.
2. **Obsidian as north star**: Clean whitespace, typography hierarchy, compact navigation, density when needed. Familiar to power users, invisible to everyone else.
3. **Arabic-first, English-second**: RTL layout is the default, not an afterthought. Mixed bidirectional text renders correctly. Thmanyah font family carries the voice.
4. **Agent and user as clear owners**: Sections have explicit ownership (agent writes Summary/Glossary/Chat; user owns Highlights/Notes). Visual treatment reflects this boundary without heavy decoration.
5. **Earned familiarity**: The tool should feel like something the user already knows how to use. Standard affordances, consistent vocabulary, no reinventing scrollbars or modals for flavor.
6. **One continuous doc**: The BookmarkDetail is a single BlockNote document — article, summary, glossary, notes, highlights, all in one scrollable editor. No separate panels, no borders between sections.
7. **Split where it helps**: Users can split the detail view into 2-3 columns to compare bookmarks side by side. Never force split — it's always opt-in.

## Core Features (v1)

### Bookmark Management
- Fetch bookmarks from X/Twitter via bird.fast CLI (paginated, cursor-based)
- Dual titles: `title_ar` and `title_en` — display follows app locale with fallback
- One hierarchical topic (tree) per bookmark, many flat hashtags
- Topics: collapsible groups in NavPanel, created by AI or user, reparent on move
- Hashtags: flat tags, many-to-many with bookmarks, independent of topic

### Triage Pipeline
- Fetch (metadata) → Classify (cheap AI) → Summarize (expensive AI, manual trigger)
- Classify assigns: priority (high/medium/low), one topic, hashtags, reading time
- Summarize generates: dual-language summary (EN + EG-AR) + contextual glossary

### Import Pipeline
- Batch fetch with cursor-based pagination
- Clean: dedup URLs, filter retweets/likes
- Enrich: local parser for domain + word count (no AI tokens)
- Classify in batches of 10-20 to amortize prompt overhead
- Progress bar with pause/resume support

### BlockNote Editor
- One continuous BlockNote doc for all sections (Summary → Glossary → Article → Highlights → Notes → Chat)
- Article section collapsible, no borders, seamless integration
- Text selection across sections for chat mentions
- Custom named sections per-bookmark (insert before/between/after fixed sections)
- English: Shantell Sans, Arabic: Playpen Sans Arabic (Google Fonts CDN)
- Agent sections (Summary/Glossary/Chat) read-only; user sections (Highlights/Notes) editable

### Split View
- 2-3 vertical columns in center panel
- Each column has own BookmarkTab bar
- Resizable dividers (300px min width)
- Triggers: drag-to-edge, split button on tab hover, right-click menu
- Only active column shows Contents sidebar

### NavPanel
- Right-side panel (RTL), mirrors position with locale
- Structure: username + profile image → action icons → grouped bookmark list
- Collapses to vertical icon strip, expands on hover/toggle
- BookmarkTab right-click: Close, Close All, Close to Right/Left, Close All But This, Open in New Column, Reopen Closed Tab

### Contents Sidebar
- Mirrors NavPanel position (left in Arabic, right in English)
- Visual inverse color scheme vs NavPanel
- Vertical mini dashes for sections, hover to reveal titles

### Notifications
- Agent proposals (approve/reject/modify) + status updates (fetch/classify complete)
- In-app notification cards

### Settings
- RTL-first layout, scrollbar clipped to rounded corners
- X/Twitter auth with username + profile image fetch
- Theme (dark/light), language, AI model, fetch frequency

## Accessibility & Inclusion

- Target: WCAG AA compliance
- Dark theme as primary (reading tool, often used in low-light)
- Light theme available for daylight use
- Reduced motion support required
- Keyboard navigation for all interactive elements
- Focus indicators must be visible
- Screen reader support for semantic HTML (buttons, landmarks, ARIA labels)
- Bidirectional text support (Arabic + English mixed)
