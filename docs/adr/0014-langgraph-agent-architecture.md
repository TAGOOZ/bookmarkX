# LangGraph Agent Architecture

Agent uses LangGraph TypeScript (ReAct loop) embedded in the Electron main process. Memory stored in SQLite with sqlite-vec for vector embeddings. Three embedding backends supported: Xenova Transformers (local), Gemini API (cloud), Ollama (cloud models via local Ollama runtime). Agent proposes actions via in-app notification cards — user approves, rejects, or modifies each. Agent has access to existing AI services as tools (classify, summarize, chat, enhance), notifications/UI, and search/discovery. No direct DB access — follows ADR-0013 boundaries. Memory includes three types: learned preferences (semantic), episode log (episodic), and user profile (facts). State schema is a flat object. Agent triggered by events (classification:complete), acts as orchestrator while pipeline keeps fetching.

## Considered Options

- **Plain SQLite tables** — Rejected: no semantic search over memory, can't learn preferences by similarity
- **Supermemory (cloud)** — Rejected: cloud-only, bookmarks leave device, conflicts with offline-first personal tool
- **OpenMemory (self-hosted)** — Rejected: adds separate server process, overkill for single-user desktop app
- **LangGraph Python SDK** — Rejected: app is TypeScript, adds Python runtime dependency

## Consequences

- Adds @langchain/langgraph, sqlite-vec, @xenova/transformers as dependencies
- Agent memory persists across sessions with vector-enhanced semantic recall
- User retains full control via ask-first approval flow
- Existing AI services (ADR-0013) are reused as LangGraph tools — no rewrite needed
