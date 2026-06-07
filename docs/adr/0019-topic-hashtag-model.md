# Topic & Hashtag Data Model

Bookmarks use a dual-label system: one hierarchical Topic (tree) and many flat Hashtags. A bookmark belongs to exactly one Topic — its parent in the tree. Both AI (during classify) and user can create topics. Moving a bookmark between topics reparents it. Hashtags are independent, non-hierarchical tags — a bookmark can have many. This separation gives the NavPanel its grouped structure (topics) while preserving flexible cross-cutting filters (hashtags).

## Considered Options

- **Flat tags only** — Rejected: no grouping hierarchy for NavPanel, can't show collapsible topic sections
- **Topic tree only (no hashtags)** — Rejected: forces single-label classification, loses cross-cutting filtering
- **Topics as parent, hashtags as leaf nodes** — Rejected: conflates two different concepts (grouping vs tagging) into one hierarchy
- **One topic + many hashtags** (chosen) — Clean separation: topic = where it lives in the panel, hashtags = how you find it across groups

## Consequences

- `bookmarks` table gains `topic_id` (FK to `topics` table) and a `hashtags` junction table
- `topics` table: `id`, `name`, `parent_id` (self-referential FK), `created_by` (ai/user), `created_at`
- `hashtags` table: `id`, `name`, `created_at` — many-to-many with bookmarks via `bookmark_hashtags`
- NavPanel renders topic tree as collapsible groups; hashtag filters are separate UI (chips or dropdown)
- Classify AI prompt must output both topic assignment and hashtag suggestions
- Moving a bookmark updates `topic_id` only — hashtags remain unchanged
- User can create/rename/delete topics; AI can only create during classify
- Duplicate topic names prevented by unique constraint on `(name, parent_id)`
