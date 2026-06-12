# Plan 058: Fix stale closures in useHashtags and useCustomSections hooks

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/renderer/components/bookmark-detail/hooks/useHashtags.ts src/renderer/components/bookmark-detail/hooks/useCustomSections.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: reliability
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Both hooks use stale state snapshots in `useCallback` callbacks. When a user rapidly adds or removes hashtags (or custom sections), the second operation may use the state from before the first operation completed, causing one change to silently overwrite the other. Functional state updates (`setHashtags(prev => ...)`) always operate on the latest state.

## Current state

- `src/renderer/components/bookmark-detail/hooks/useHashtags.ts` — `addHashtag` depends on `hashtags` in the dep array and builds `updated = [...hashtags, newHashtag]`. Same for `removeHashtag`.
- `src/renderer/components/bookmark-detail/hooks/useCustomSections.ts` — `createSection` depends on `customSections`. Same for `updateSection`, `deleteSection`, `moveSection`.

Key code in `useHashtags.ts` (lines 26-40):
```typescript
const addHashtag = useCallback(async (name: string) => {
  const newHashtag: Hashtag = { id: `tag-${Date.now()}`, name };
  const updated = [...hashtags, newHashtag]; // stale if called rapidly
  setHashtags(updated);
  onBookmarkChange?.({ hashtags: updated });
  try { await addBookmarkHashtag(hashtagId, name); }
  catch (e) { setHashtags(hashtags); }
}, [bookmarkId, hashtags, onBookmarkChange]); // hashtags in deps = stale closure risk
```

Key code in `useHashtags.ts` (lines 42-51):
```typescript
const removeHashtag = useCallback(async (tagId: string) => {
  const updated = hashtags.filter((h) => h.id !== tagId); // stale if called rapidly
  setHashtags(updated);
  onBookmarkChange?.({ hashtags: updated });
  try { await removeBookmarkHashtag(hashtagId, tagId); }
  catch (e) { setHashtags(hashtags); }
}, [bookmarkId, hashtags, onBookmarkChange]);
```

Key code in `useCustomSections.ts` (lines 27-45):
```typescript
const createSection = useCallback(async (title: string, content: string) => {
  const newSection = { id: `section-${Date.now()}`, title, content, order: customSections.length };
  const updated = [...customSections, newSection]; // stale
  setCustomSections(updated);
  onBookmarkChange?.({ customSections: updated });
  // ...
}, [bookmarkId, customSections, onBookmarkChange]);
```

Convention: hooks use `useCallback` with explicit dependency arrays. Error recovery restores the previous state.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/hooks/useHashtags.ts`
- `src/renderer/components/bookmark-detail/hooks/useCustomSections.ts`

**Out of scope**:
- Components that consume these hooks
- Other hooks

## Steps

### Step 1: Fix `useHashtags.ts` — use functional state updates

Replace `addHashtag` and `removeHashtag` to use functional `setHashtags(prev => ...)` pattern. Remove `hashtags` from the `useCallback` dependency arrays. Move `onBookmarkChange` calls outside the setState or derive from the new value.

For `addHashtag`:
```typescript
const addHashtag = useCallback(async (name: string) => {
  const newHashtag: Hashtag = { id: `tag-${Date.now()}`, name };
  setHashtags(prev => {
    const updated = [...prev, newHashtag];
    onBookmarkChange?.({ hashtags: updated });
    return updated;
  });
  try { await addBookmarkHashtag(hashtagId, name); }
  catch (e) {
    setHashtags(prev => {
      const reverted = prev.filter(h => h.id !== newHashtag.id);
      onBookmarkChange?.({ hashtags: reverted });
      return reverted;
    });
  }
}, [bookmarkId, onBookmarkChange]); // removed hashtags from deps
```

For `removeHashtag`:
```typescript
const removeHashtag = useCallback(async (tagId: string) => {
  let removedTag: Hashtag | undefined;
  setHashtags(prev => {
    removedTag = prev.find(h => h.id === tagId);
    const updated = prev.filter(h => h.id !== tagId);
    onBookmarkChange?.({ hashtags: updated });
    return updated;
  });
  try { await removeBookmarkHashtag(hashtagId, tagId); }
  catch (e) {
    if (removedTag) {
      setHashtags(prev => {
        const reverted = [...prev, removedTag!];
        onBookmarkChange?.({ hashtags: reverted });
        return reverted;
      });
    }
  }
}, [bookmarkId, onBookmarkChange]); // removed hashtags from deps
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Fix `useCustomSections.ts` — use functional state updates

Apply the same pattern to all five callbacks: `createSection`, `updateSection`, `deleteSection`, `moveSection`. Remove `customSections` from all `useCallback` dependency arrays.

For `createSection`:
```typescript
const createSection = useCallback(async (title: string, content: string) => {
  const newSection = { id: `section-${Date.now()}`, title, content, order: 0 };
  setCustomSections(prev => {
    newSection.order = prev.length;
    const updated = [...prev, newSection];
    onBookmarkChange?.({ customSections: updated });
    return updated;
  });
  // ... API calls
}, [bookmarkId, onBookmarkChange]); // removed customSections
```

For `updateSection`:
```typescript
const updateSection = useCallback(async (sectionId: string, title: string, content: string) => {
  setCustomSections(prev => {
    const updated = prev.map(s => s.id === sectionId ? { ...s, title, content } : s);
    onBookmarkChange?.({ customSections: updated });
    return updated;
  });
  // ... API calls
}, [bookmarkId, onBookmarkChange]); // removed customSections
```

For `deleteSection`:
```typescript
const deleteSection = useCallback(async (sectionId: string) => {
  setCustomSections(prev => {
    const updated = prev.filter(s => s.id !== sectionId);
    onBookmarkChange?.({ customSections: updated });
    return updated;
  });
  // ... API calls
}, [bookmarkId, onBookmarkChange]); // removed customSections
```

For `moveSection`:
```typescript
const moveSection = useCallback(async (sectionId: string, direction: 'up' | 'down') => {
  setCustomSections(prev => {
    const idx = prev.findIndex(s => s.id === sectionId);
    if (idx === -1) return prev;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= prev.length) return prev;
    const updated = [...prev];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    onBookmarkChange?.({ customSections: updated });
    return updated;
  });
  // ... API calls
}, [bookmarkId, onBookmarkChange]); // removed customSections
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass — no behavior change for normal (non-rapid) usage
- No new tests required — stale closure bugs are timing-dependent and hard to unit test

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `hashtags` is NOT in `addHashtag` or `removeHashtag` `useCallback` dependency arrays
- [ ] `customSections` is NOT in `createSection`, `updateSection`, `deleteSection`, or `moveSection` `useCallback` dependency arrays
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require changing the component layer

## Maintenance notes

- All state update callbacks should use the functional form (`setState(prev => ...)`) when the new state depends on the previous state — this prevents stale closures
- If `onBookmarkChange` is called inside `setState`, ensure it doesn't trigger re-renders that would cause infinite loops
