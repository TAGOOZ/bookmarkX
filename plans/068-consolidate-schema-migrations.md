# Plan 068: Consolidate schema migrations to skip on existing databases

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e4bb75e..HEAD -- src/db/schema.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e4bb75e`, 2026-06-13

## Why this matters

Every startup runs `initializeSchema()` which executes 20+ `ALTER TABLE` statements wrapped in try/catch — each one attempts the ALTER, catches the "column already exists" error, and moves on. On an existing database this is pure waste: ~20 sequential DB round-trips that always fail. The fix: detect whether the DB is already initialized and skip all migrations.

## Current state

- `src/db/schema.ts` — contains `initializeSchema()` with CREATE TABLE IF NOT EXISTS, then ~15 individual ALTER TABLE try/catch blocks, then CREATE INDEX IF NOT EXISTS
- `src/main.ts:119` — calls `await initializeSchema(db)` on every startup
- The schema SQL creates tables with all columns already defined. The ALTER TABLE blocks only exist for databases created before those columns were added.

Key excerpt from `src/db/schema.ts:155-166`:
```typescript
export async function initializeSchema(db: Client): Promise<void> {
  await db.executeMultiple(SCHEMA_SQL);

  // Migration: add blocks_json if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN blocks_json TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }
  // ... 14 more ALTER TABLE blocks like this
```

Convention: Error handling uses try/catch with empty catch for "already exists" — this is the established pattern in this codebase.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/db/schema.ts`

**Out of scope**:
- `src/main.ts` — no changes needed; it already calls `initializeSchema(db)`
- Any other DB modules

## Git workflow

- Branch: `advisor/068-consolidate-schema-migrations`
- Commit: `perf(db): skip schema migrations on existing databases`

## Steps

### Step 1: Add schema version tracking

Add a `schema_version` table and a version constant. After the initial `executeMultiple(SCHEMA_SQL)`, check if the version table exists and the version matches. If so, skip all ALTER TABLE migrations.

In `src/db/schema.ts`, add at the top of the file (after the SCHEMA_SQL constant):

```typescript
const SCHEMA_VERSION = 2; // Bump when adding new migrations below SCHEMA_SQL
```

At the start of `initializeSchema`, add:

```typescript
export async function initializeSchema(db: Client): Promise<void> {
  // Ensure version tracking table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  // Check current version
  const { rows } = await db.execute('SELECT version FROM _schema_version LIMIT 1');
  const currentVersion = rows[0] ? Number(rows[0].version) : 0;

  if (currentVersion >= SCHEMA_VERSION) {
    // Schema is up to date — skip all migrations
    return;
  }

  // First-time setup or upgrade: run full schema
  await db.executeMultiple(SCHEMA_SQL);

  // ... existing ALTER TABLE migration blocks ...

  // Update version
  await db.execute('DELETE FROM _schema_version');
  await db.execute({ sql: 'INSERT INTO _schema_version (version) VALUES (?)', args: [SCHEMA_VERSION] });
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests pass

**Verify**: `pnpm test` → all pass

### Step 3: Verify lint

**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests in `src/db/__tests__/schema.test.ts` should continue to pass
- No new tests needed — this is a startup optimization, not behavior change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside `src/db/schema.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/db/schema.ts` doesn't match the excerpts above
- A test fails after the change
- You need to modify files outside `src/db/schema.ts`

## Maintenance notes

- When adding new migrations (new columns/tables), increment `SCHEMA_VERSION` and add the migration code inside the `if (currentVersion < SCHEMA_VERSION)` block
- The `_schema_version` table is internal — never expose it to IPC or renderer
- The `SCHEMA_SQL` still uses `IF NOT EXISTS` so it's safe to run even if version tracking is somehow lost
