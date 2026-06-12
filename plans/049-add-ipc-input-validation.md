# Plan 049: Add input validation to glossary and custom-section IPC handlers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/main/ipc/content.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Several IPC handlers accept arbitrary-length strings with no validation. A malicious or buggy client could send megabytes of data in a single call, wasting memory and potentially causing issues downstream. The `send-chat-message` handler already has length validation as a pattern to follow.

## Current state

- `src/main/ipc/content.ts` — IPC handlers

**Unchecked handlers**:
- `add-glossary-term` (line 110-113): accepts `term` and `definition` strings with no length limit
- `create-custom-section` (line 172-174): accepts `title` and `content` strings with no length limit
- `reorder-custom-sections` (line ~178-180): accepts `orderedIds` array with no size limit

**Existing validation pattern (send-chat-message, line 53-55)**:
```typescript
if (!message || typeof message !== 'string' || message.length > 10000) {
  throw new Error('Invalid message');
}
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/ipc/content.ts`

**Out of scope**:
- DB layer
- UI components

## Steps

### Step 1: Add validation to add-glossary-term handler

Add length checks following the existing pattern:
- `term`: max 500 characters
- `definition`: max 5000 characters

Throw an error with a descriptive message if validation fails.

**Verify**: `pnpm lint` → exit 0

### Step 2: Add validation to create-custom-section handler

Add length checks:
- `title`: max 500 characters
- `content`: max 50000 characters

**Verify**: `pnpm lint` → exit 0

### Step 3: Add validation to reorder-custom-sections handler

Add checks:
- `orderedIds` must be a non-empty array
- Max 1000 items

**Verify**: `pnpm lint` → exit 0

### Step 4: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass
- No new tests required for this security hardening change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "500" src/main/ipc/content.ts` returns matches in add-glossary-term and create-custom-section
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file
