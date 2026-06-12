# Plan 022: Fix video bookmark misclassification as outer_link

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/fetch/bird.ts src/fetch/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

The `classifyContentType` function at `src/fetch/bird.ts:20-25` checks for threads, outer links, and articles, but has no branch for video content. Videos fall through to `return 'outer_link'`. The `Bookmark` type at `src/fetch/types.ts` supports `'video'` as a content_type — this is a missing branch, not a missing type.

## Current state

- `src/fetch/bird.ts:20-25`:
  ```typescript
  function classifyContentType(raw: any): Bookmark['content_type'] {
    if (raw.is_thread || raw.thread_tweet_count > 1) return 'thread';
    if (raw.urls && raw.urls.length > 0) return 'outer_link';
    if (raw.is_article) return 'x_article';
    return 'outer_link';
  }
  ```
- `src/fetch/types.ts` — `Bookmark` type has `content_type: 'outer_link' | 'thread' | 'x_article' | 'video'`
- No branch handles `raw.is_video` or `raw.video`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test -- bird`      | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/fetch/bird.ts` — add video branch to `classifyContentType`
- `src/fetch/__tests__/bird.test.ts` — add test for video classification

**Out of scope**:
- `src/fetch/types.ts` — `Bookmark` type already supports `'video'`
- Any UI changes for video bookmarks

## Git workflow

- Branch: `advisor/022-fix-video-classification`
- Commit: `fix(fetch): classify video bookmarks as 'video' instead of 'outer_link'`

## Steps

### Step 1: Add video branch to classifyContentType

In `src/fetch/bird.ts`, insert a video check before the final fallback. The check should go after the thread check and before the outer_link check, since a video tweet might also have URLs:

```typescript
function classifyContentType(raw: any): Bookmark['content_type'] {
  if (raw.is_thread || raw.thread_tweet_count > 1) return 'thread';
  if (raw.is_video || raw.video) return 'video';
  if (raw.urls && raw.urls.length > 0) return 'outer_link';
  if (raw.is_article) return 'x_article';
  return 'outer_link';
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add test for video classification

In `src/fetch/__tests__/bird.test.ts`, add a test case that verifies video bookmarks are classified as `'video'`:

```typescript
it('classifies video bookmarks as video', () => {
  // Test with raw.is_video = true
  // Test with raw.video = true
});
```

Follow the existing test pattern in the file.

**Verify**: `pnpm test -- bird` → all tests pass including new video test

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all pass

## Test plan

- New test: `classifyContentType` returns `'video'` when `raw.is_video` is true
- New test: `classifyContentType` returns `'video'` when `raw.video` is truthy
- Existing tests for thread, outer_link, and x_article should still pass
- Pattern to follow: `src/fetch/__tests__/bird.test.ts`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; bird tests include new video classification test
- [ ] `grep -n "is_video" src/fetch/bird.ts` shows the new branch
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The bird CLI output format for video tweets is unknown (check existing tests or docs for the raw object shape)
- Adding the video branch causes existing tests to fail

## Maintenance notes

- The bird CLI may expose video information under different field names depending on the tweet type. If `is_video` is not the correct field, check the bird CLI documentation or existing test fixtures for the actual field name.
- Video bookmarks may need special rendering in the UI (video player vs link). That's out of scope for this plan.
