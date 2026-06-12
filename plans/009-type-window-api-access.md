# Plan 009: Replace (window as any).api with typed window.api

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/renderer/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

`(window as any).api` is used 47 times across the renderer, bypassing the typed `Window.api` interface in `renderer/types.ts`. This means zero compile-time safety — typos in method names, wrong argument types, and missing methods produce no errors.

## Current state

- `src/renderer/types.ts` — defines `Window.api` interface (lines 57-149)
- 47 sites across renderer use `(window as any).api?.method?.()`

**The pattern to replace**:
```typescript
// Before
const result = await (window as any).api?.someMethod?.(arg1, arg2);

// After
const result = await window.api.someMethod(arg1, arg2);
```

The `?.` optional chaining on `window.api` is unnecessary because the preload script always exposes `api` before React mounts. The typed interface guarantees the method exists.

**Files with occurrences** (from grep):
- `src/renderer/components/NavPanel.tsx` — 14 sites
- `src/renderer/components/bookmark-detail/BookmarkDetail.tsx` — 25 sites
- `src/renderer/components/ImportProgress.tsx` — 4 sites
- `src/renderer/components/SearchOverlay.tsx` — 1 site
- `src/renderer/components/bookmark-detail/GlossaryPanel.tsx` — 1 site
- `src/renderer/components/bookmark-detail/extensions/ChatBlock.tsx` — 1 site

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/components/NavPanel.tsx`
- `src/renderer/components/bookmark-detail/BookmarkDetail.tsx`
- `src/renderer/components/ImportProgress.tsx`
- `src/renderer/components/SearchOverlay.tsx`
- `src/renderer/components/bookmark-detail/GlossaryPanel.tsx`
- `src/renderer/components/bookmark-detail/extensions/ChatBlock.tsx`

**Out of scope**:
- `src/renderer/types.ts` (the type definition is correct)
- `src/preload.ts` (already correct)

## Steps

### Step 1: Replace in NavPanel.tsx

Replace all 14 occurrences of `(window as any).api?.` with `window.api.` in `src/renderer/components/NavPanel.tsx`.

Use find-and-replace: `(window as any).api?.` → `window.api.`

**Verify**: `grep -c "(window as any)" src/renderer/components/NavPanel.tsx` → 0

### Step 2: Replace in BookmarkDetail.tsx

Replace all 25 occurrences in `src/renderer/components/bookmark-detail/BookmarkDetail.tsx`.

**Verify**: `grep -c "(window as any)" src/renderer/components/bookmark-detail/BookmarkDetail.tsx` → 0

### Step 3: Replace in remaining files

Replace occurrences in:
- `src/renderer/components/ImportProgress.tsx` (4 sites)
- `src/renderer/components/SearchOverlay.tsx` (1 site)
- `src/renderer/components/bookmark-detail/GlossaryPanel.tsx` (1 site)
- `src/renderer/components/bookmark-detail/extensions/ChatBlock.tsx` (1 site)

**Verify**: `grep -rn "(window as any)" src/renderer/` → no matches

### Step 4: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- TypeScript now catches method name typos and wrong argument types at compile time

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -rn "(window as any)" src/renderer/` → no matches
- [ ] All IPC calls use typed `window.api.method()` form
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- TypeScript errors appear after the replacement (indicates a missing method in the type definition)
