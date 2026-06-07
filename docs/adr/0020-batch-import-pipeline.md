# Batch Import Pipeline

Importing hundreds of Twitter bookmarks requires a paginated, batched pipeline that avoids burning AI tokens on all links at once. Flow: Fetch (paginated via bird.fast cursor) → Clean (dedup URLs, filter retweets/likes) → Enrich (extract domain, read-time estimate via local parsing) → Classify (batched cheap AI). Bookmarks are importable before classification — user can browse metadata immediately. Classification and summarization happen lazily on demand or in small background batches.

## Considered Options

- **Fetch all, classify lazily** — Rejected: user sees hundreds of unclassified bookmarks with no priority signal
- **Fetch all, classify top N** — Rejected: arbitrary cutoff, misses bookmarks the user actually cares about
- **Fetch in batches, classify in batches** (chosen) — Incremental import with progressive enrichment, respects token budget
- **Streaming import with real-time classify** — Rejected: complex error handling, no pause/resume, harder to debug

## Consequences

- bird.fast CLI must support cursor-based pagination (`--cursor` flag) for fetching all bookmarks
- New `import_jobs` table tracks batch state: `id`, `status`, `cursor`, `total_fetched`, `total_classified`, `started_at`, `completed_at`
- Dedup uses URL unique constraint — duplicate inserts are upserts (merge hashtags/topics)
- Enrich step uses local parser (Readability + Cheerio) for domain extraction and word count — no AI tokens
- Classify batches of 10-20 bookmarks per AI call to amortize prompt overhead
- UI shows import progress bar with counts (fetched / classified / total)
- User can pause/resume import — cursor is persisted in `import_jobs`
- Failed batches retry individually (3 attempts) before marking as failed
- Import runs in main process via IPC, renderer receives progress events
- Existing bookmarks are matched by URL — re-importing enriches without duplicating
