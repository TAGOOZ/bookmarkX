# BookmarkX

Personal knowledge management desktop app that solves "bookmark FOMO" — the anxiety of saving links you never read. Automatically fetches your X/Twitter bookmarks, classifies them by priority and topic using AI, and provides on-demand Egyptian Arabic summaries with contextual glossaries.

## Features

- **Auto-fetch** X/Twitter bookmarks via bird.fast CLI (paginated, cursor-based)
- **AI classify** — priority (high/medium/low), topic assignment, hashtags, reading time
- **AI summarize** — dual-language (English + Egyptian Arabic) summaries with glossaries
- **Import pipeline** — batch import hundreds of bookmarks with progress tracking
- **BlockNote editor** — single continuous doc for summary, article, notes, chat
- **Split view** — open 2-3 bookmarks side by side in resizable columns
- **RTL/LTR** — full Arabic-first layout with language switching
- **Offline-first** — works with previously fetched data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron + Vite |
| Frontend | React + TypeScript |
| Styling | CSS Modules |
| Editor | BlockNote (Notion-style) |
| i18n | react-intl |
| Database | libSQL (SQLite) |
| AI | Google Gemini API + Ollama fallback |
| Article Parser | Readability + Cheerio |
| Fonts | Thmanyah (app), Shantell Sans + Playpen Sans Arabic (editor) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- X/Twitter auth tokens (for bookmark fetching)
- Gemini API key (for AI features)

## Setup

```bash
# Clone
git clone https://github.com/TAGOOZ/bookmarkX.git
cd bookmarkX

# Install
pnpm install

# Start (Linux)
pnpm start:linux

# Start (macOS/Windows)
pnpm start
```

## Configuration

On first launch, the app works immediately but shows a prompt to complete setup. You can:

1. **Login with Twitter** — opens in-app browser to capture session cookies
2. **Manual entry** — paste `auth_token` and `ct0` from Chrome DevTools
3. **Chrome auto-detect** — extracts cookies from Chrome on Linux automatically

Settings are stored in `~/.config/bookmarkX/user.json`.

## Development

```bash
# Lint
pnpm lint

# Test
pnpm test

# Test (watch mode)
pnpm test:watch

# Package
pnpm package

# Build installer
pnpm make
```

## Project Structure

```
bookmarkX/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React UI
│   │   ├── components/ # UI components
│   │   ├── styles/     # CSS Modules
│   │   └── App.tsx     # Root component
│   ├── classify/       # AI classification service
│   ├── fetch/          # bird.fast bookmark fetcher
│   ├── parser/         # Article parser (Readability + Cheerio)
│   ├── pipeline/       # Triage pipeline orchestrator
│   ├── db/             # libSQL database layer
│   ├── services/       # Service layer (AI, agent)
│   └── scheduler/      # node-cron job scheduler
├── locales/            # Translation files (ar.json, en.json)
├── docs/
│   ├── PRD.md          # Product Requirement Document
│   └── adr/            # Architecture Decision Records
├── CONTEXT.md          # Domain language glossary
├── PRODUCT.md          # Product principles
└── AGENTS.md           # Agent instructions
```

## Architecture

Two-panel RTL layout:
- **NavPanel** (right in Arabic, left in English) — grouped bookmarks, action icons, user identity. Collapses to vertical icon strip.
- **BookmarkDetail** (center) — single continuous BlockNote document. Supports 2-3 column split view.

See [docs/PRD.md](docs/PRD.md) for full specification and [docs/adr/](docs/adr/) for architectural decisions.

## License

MIT
