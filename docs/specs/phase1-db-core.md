# Phase 1: DB Schema + Topic/Hashtag Services

## Goal

Migrate from flat topic model to hierarchical topics + flat hashtags per ADR-0019. Add import_jobs table per ADR-0020.

## Schema Changes

### Topics table (REPLACE existing)

Current: `id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL`
New:
```sql
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
  created_by TEXT CHECK(created_by IN ('ai', 'user')) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, parent_id)
);
```

### Bookmark-topic assignment (REPLACE bookmark_topics)

Current: many-to-many junction
New: single topic per bookmark — add `topic_id` FK directly on `bookmarks` table

```sql
ALTER TABLE bookmarks ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL;
```

Drop `bookmark_topics` table after migrating data.

### Hashtags table (NEW)

```sql
CREATE TABLE IF NOT EXISTS hashtags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Bookmark-hashtags junction (NEW)

```sql
CREATE TABLE IF NOT EXISTS bookmark_hashtags (
  bookmark_id TEXT REFERENCES bookmarks(id) ON DELETE CASCADE,
  hashtag_id TEXT REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, hashtag_id)
);
```

### Import jobs table (NEW)

```sql
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  status TEXT CHECK(status IN ('running', 'paused', 'completed', 'failed')) DEFAULT 'running',
  cursor TEXT,
  total_fetched INTEGER DEFAULT 0,
  total_classified INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

## Breaking Changes

1. **ClassificationResult.topics**: `string[]` → `string` (single topic name)
2. **storeClassification**: Must set `bookmarks.topic_id` instead of inserting into `bookmark_topics`
3. **getClassification**: Must read `bookmarks.topic_id` JOIN topics, not `bookmark_topics`
4. **NavPanel groupedBookmarks**: Currently groups by `bookmark.topic` (priority string!) — must group by actual topic name from DB
5. **Bookmark interface**: `topic: string` stays, but now it's the actual topic name, not priority

## Files to Create

- `src/db/topics.ts` — Topic CRUD, tree operations, reparent
- `src/db/hashtags.ts` — Hashtag CRUD, attach/detach from bookmarks
- `src/db/import-jobs.ts` — Import job CRUD (cursor tracking, status updates)

## Files to Modify

- `src/db/schema.ts` — New tables, migration for topics FK on bookmarks, drop bookmark_topics
- `src/db/classifications.ts` — Store single topic, read from bookmarks.topic_id
- `src/classify/types.ts` — `topics: string[]` → `topic: string`
- `src/classify/classifier.ts` — Return single topic instead of array
- `src/preload.ts` — Expose new IPC channels for topics/hashtags
- `src/main.ts` — Register new IPC handlers

## Test Plan

1. Schema migration: verify topics table has parent_id, bookmarks has topic_id
2. Topic tree: create parent → child → grandchild, verify tree structure
3. Reparent: move bookmark between topics, verify topic_id updates
4. Hashtags: create, attach to bookmark, detach, verify junction
5. Classify: verify single topic stored in bookmarks.topic_id
6. Import jobs: create, update cursor, mark completed
