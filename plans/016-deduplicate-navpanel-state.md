# Plan 016: Deduplicate NavPanel localStorage state with uiStore

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/renderer/components/NavPanel.tsx src/renderer/stores/uiStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

NavPanel defines its own `isExpanded` and `expandedTopics` state using `localStorage` directly, while `uiStore.ts` already manages the same data in a zustand store. The store is dead code for these values.

## Current state

- `src/renderer/components/NavPanel.tsx:35-36,53-71` — local state with localStorage
- `src/renderer/stores/uiStore.ts:3-4,18-56` — zustand store with same keys

Both use `EXPANDED_KEY` and `EXPANDED_TOPICS_KEY` for localStorage.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/components/NavPanel.tsx`
- `src/renderer/stores/uiStore.ts` (verify it's correct)

**Out of scope**:
- Other components using uiStore

## Steps

### Step 1: Read both files to understand the state

Read NavPanel.tsx and uiStore.ts to understand:
- What localStorage keys are used
- What state is managed
- How the store is structured

### Step 2: Replace local state with store reads/writes

In NavPanel.tsx:
1. Import `useUIStore` from the store
2. Replace local `isExpanded` state with `useUIStore(s => s.navExpanded)`
3. Replace local `expandedTopics` state with `useUIStore(s => s.expandedTopics)`
4. Remove the localStorage read/write logic for these values
5. Use store actions to update state

### Step 3: Remove duplicate constants

Remove `EXPANDED_KEY` and `EXPANDED_TOPICS_KEY` constants from NavPanel.tsx if they're now only in uiStore.

### Step 4: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- NavPanel reads from zustand store instead of local state

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] NavPanel uses `useUIStore` for expanded state
- [ ] No duplicate localStorage key definitions
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- uiStore doesn't have the expected state shape
