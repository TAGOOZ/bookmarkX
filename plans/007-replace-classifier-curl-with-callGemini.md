# Plan 007: Replace classifier curl with callGemini

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/classify/classifier.ts src/services/gemini.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 003 (API key already moved to header)
- **Category**: tech-debt
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

The classifier shells out to `curl` via `execFile` for each bookmark, spawning an OS process. Meanwhile `src/services/gemini.ts` has `callGemini` with native `fetch`, retry, and exponential backoff. The classifier bypasses all of this.

## Current state

- `src/classify/classifier.ts` — the classifier (99 lines)
- `src/services/gemini.ts` — shared Gemini client (93 lines)

**classifier.ts** uses `execFile('curl', ...)` (lines 8-15, 56-62).
**gemini.ts** exports `callGemini(prompt, { apiKey, model })` with retry logic.

**`callGemini` signature** (gemini.ts:21-24):
```typescript
export async function callGemini(
  prompt: string,
  options: { apiKey: string; model: string; retry?: RetryOptions },
): Promise<string>
```

It returns the cleaned text response (markdown fences stripped).

**`classifyBookmark`** currently builds a prompt (lines 17-35), calls curl, parses JSON, validates the result.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/classify/classifier.ts`

**Out of scope**:
- `src/services/gemini.ts` (consumed, not modified)
- Callers of `classifyBookmark` (signature unchanged)

## Steps

### Step 1: Replace curl with callGemini

Remove the `execFile` import, `dotenv` import/call, and `runCurl` function.

Import `callGemini` from `../services/gemini`.

Replace the curl call (lines 48-68) with:

```typescript
const text = await callGemini(prompt, { apiKey, model });

let result: ClassificationResult;
try {
  result = JSON.parse(text) as ClassificationResult;
} catch {
  throw new Error(`Failed to parse classification result as JSON: ${text.substring(0, 200)}`);
}
```

Remove `dotenv.config()` and the `execFile` import.

**Verify**: `grep -n "execFile\|dotenv\|runCurl" src/classify/classifier.ts` → no matches
**Verify**: `grep -n "callGemini" src/classify/classifier.ts` → 1 match

### Step 2: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- The classifier now benefits from retry/backoff

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] No `execFile`, `dotenv`, or `runCurl` references in `classifier.ts`
- [ ] `callGemini` is imported and used for the API call
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- `callGemini` signature has changed
