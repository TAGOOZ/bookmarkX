# Plan 018: Extract BookmarkDetail into custom hooks (Direction)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/renderer/components/bookmark-detail/BookmarkDetail.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans 009 (typed window.api) should land first
- **Category**: direction
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

`BookmarkDetail.tsx` is 763 lines with 15+ `useState`, 15+ `useEffect`, 12+ `useCallback`. Any change to bookmark detail behavior touches this file. Testing individual features requires rendering the entire component tree. Extracting custom hooks makes each feature independently testable.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkDetail.tsx` — 763 lines

The component manages: editor state, chat session, selection toolbar, enhanced text, parsing state, scroll progress, reader mode, summarizing state, glossary generation, hashtags, custom sections, notification toasts, and more.

**Hook extraction candidates** (each is a self-contained state machine):
1. `useChatSession` — chat session creation, message sending, history
2. `useHashtags` — hashtag CRUD for the current bookmark
3. `useCustomSections` — custom section CRUD and reordering
4. `useArticleExtraction` — extract article, loading state, error handling
5. `useSelectionToolbar` — text selection, highlight creation
6. `useSummaryAndGlossary` — summarize trigger, glossary generation

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- New files: `src/renderer/components/bookmark-detail/hooks/useChatSession.ts`, `useHashtags.ts`, `useCustomSections.ts`, `useArticleExtraction.ts`, `useSelectionToolbar.ts`, `useSummaryAndGlossary.ts`
- Modified: `src/renderer/components/bookmark-detail/BookmarkDetail.tsx` (slim down)

**Out of scope**:
- Other components
- Editor behavior changes

## Steps

### Step 1: Extract useChatSession

Move chat-related state and logic into `hooks/useChatSession.ts`:
- `chatSessionId` state
- `createChatSession` effect
- `handleSendMessage` callback
- `chatMessages` state

The hook takes `bookmarkId` and returns `{ messages, sendMessage, isLoading }`.

### Step 2: Extract useHashtags

Move hashtag state and logic into `hooks/useHashtags.ts`:
- `hashtags` state
- `handleAddHashtag`, `handleRemoveHashtag` callbacks

The hook takes `bookmarkId` and returns `{ hashtags, addHashtag, removeHashtag }`.

### Step 3: Extract useCustomSections

Move custom section state and logic into `hooks/useCustomSections.ts`:
- `customSections` state
- CRUD callbacks

### Step 4: Extract useArticleExtraction

Move article extraction into `hooks/useArticleExtraction.ts`:
- `isExtracting` state
- `handleExtract` callback

### Step 5: Extract useSelectionToolbar

Move text selection handling into `hooks/useSelectionToolbar.ts`:
- Selection state
- Highlight creation

### Step 6: Extract useSummaryAndGlossary

Move summarize/glossary into `hooks/useSummaryAndGlossary.ts`:
- `isSummarizing`, `isGeneratingGlossary` states
- Trigger callbacks

### Step 7: Update BookmarkDetail.tsx

Import all hooks and compose them. The component should become a thin shell that:
1. Calls each hook with `bookmark.id`
2. Passes returns to child components
3. Handles layout and rendering only

### Step 8: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Each hook can be tested independently with `renderHook`
- Existing BookmarkDetail tests should still pass
- New test files for each hook (optional, can be a follow-up)

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] 6 new hook files exist under `hooks/`
- [ ] `BookmarkDetail.tsx` is under 300 lines
- [ ] Each hook is independently importable
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Extracting a hook reveals circular dependencies
- BookmarkDetail.tsx cannot be slimmed below 400 lines (report back)
