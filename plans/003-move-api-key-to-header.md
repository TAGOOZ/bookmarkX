# Plan 003: Move Gemini API key from URL query param to HTTP header in classifier

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/classify/classifier.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

The classifier passes the Gemini API key as a URL query parameter (`?key=${apiKey}`), which is visible in process listings (`/proc/*/cmdline`) and proxy logs. The other Gemini client (`src/services/gemini.ts`) correctly uses the `x-goog-api-key` HTTP header.

## Current state

- `src/classify/classifier.ts` — the bookmark classifier (99 lines)

**The vulnerable code (line 54)**:
```typescript
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
```

**The curl call (lines 56-62)**:
```typescript
const stdout = await runCurl([
  '-s',
  '-X', 'POST',
  '-H', 'Content-Type: application/json',
  '-d', payload,
  url,
]);
```

**The correct pattern** in `src/services/gemini.ts:36-43`:
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'x-goog-api-key': options.apiKey,
    'Content-Type': 'application/json',
  },
  body: payload,
});
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/classify/classifier.ts`

**Out of scope**:
- `src/services/gemini.ts` (already correct)
- Other services

## Steps

### Step 1: Remove `?key=${apiKey}` from URL and add header to curl args

Change line 54 from:
```typescript
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
```
to:
```typescript
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
```

Change lines 56-62 from:
```typescript
const stdout = await runCurl([
  '-s',
  '-X', 'POST',
  '-H', 'Content-Type: application/json',
  '-d', payload,
  url,
]);
```
to:
```typescript
const stdout = await runCurl([
  '-s',
  '-X', 'POST',
  '-H', 'Content-Type: application/json',
  '-H', `x-goog-api-key: ${apiKey}`,
  '-d', payload,
  url,
]);
```

**Verify**: `grep -n "key=\${apiKey}" src/classify/classifier.ts` → no matches
**Verify**: `grep -n "x-goog-api-key" src/classify/classifier.ts` → 1 match

### Step 2: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- The classifier now uses the same auth pattern as `gemini.ts`

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] No `?key=` in any URL string in `classifier.ts`
- [ ] `x-goog-api-key` header is present in curl args
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
