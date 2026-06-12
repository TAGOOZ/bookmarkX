# Plan 019: Install defuddle dependency to enable primary article parser

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/parser/extract-content.ts package.json pnpm-lock.yaml`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug (broken parser pipeline)
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

The primary article parser pipeline (Defuddle → Turndown → parseMDToBlocks) is defined in ADR-0015 and documented in the PRD as the first-choice parser. However, `defuddle` is not listed in `package.json` or `pnpm-lock.yaml`. The import at `src/parser/extract-content.ts:1` (`import { Defuddle } from 'defuddle/node'`) will fail at runtime, causing every article parse to fall through to the Gemini API fallback. This burns API tokens unnecessarily and degrades parsing quality.

## Current state

- `src/parser/extract-content.ts:1` — `import { Defuddle } from 'defuddle/node';` — the import exists and is used in the extract function
- `src/parser/local-parser.ts` — calls `extractContent` which uses Defuddle
- `src/parser/orchestrator.ts` — fallback chain: Defuddle → cheerio → Gemini
- `package.json` — no `defuddle` in dependencies or devDependencies
- `pnpm-lock.yaml` — no reference to defuddle
- The existing cheerio parser at `src/parser/cheerio-parser.ts` serves as intermediate fallback

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm add defuddle`      | exit 0, added to package.json |
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `package.json` — add defuddle to dependencies
- `pnpm-lock.yaml` — auto-updated by pnpm

**Out of scope** (do NOT touch, even though they look related):
- `src/parser/extract-content.ts` — the import already exists, no changes needed
- `src/parser/local-parser.ts` — already calls extractContent correctly
- Any parser logic changes — this plan only installs the missing dependency

## Git workflow

- Branch: `advisor/019-install-defuddle`
- Commit: `chore(deps): add defuddle dependency for article parser`

## Steps

### Step 1: Install defuddle

Run `pnpm add defuddle` to install the package and update lockfile.

**Verify**: `pnpm add defuddle` → exit 0; `grep defuddle package.json` → shows `"defuddle"` in dependencies

### Step 2: Verify import resolves

Run `node -e "require('defuddle/node')"` or `pnpm typecheck` to confirm the module resolves.

**Verify**: `pnpm typecheck` → exit 0, no errors about defuddle import

### Step 3: Run existing parser tests

Run the existing parser tests to confirm nothing breaks.

**Verify**: `pnpm test -- parser` → all parser tests pass

### Step 4: Run full test suite

**Verify**: `pnpm test` → all 427+ tests pass

## Test plan

- No new tests needed — this plan installs a missing dependency. The existing parser tests (`src/parser/__tests__/*.test.ts`) already exercise the code paths that use defuddle. If defuddle resolves correctly, these tests will now actually test the real parser instead of falling through to mocks.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep defuddle package.json` shows the dependency
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm add defuddle` fails with native module build errors in Electron context
- `pnpm typecheck` reports new errors after installation
- The import at `src/parser/extract-content.ts:1` has changed since commit `9eea449`

## Maintenance notes

- After this lands, the `src/parser/cheerio-parser.ts` intermediate fallback is only reached when Defuddle fails (paywall, JS-rendered pages). Consider removing it in a future cleanup if Defuddle proves reliable.
- The `defuddle` package is maintained by the Obsidian creator (kepano) — good ecosystem alignment.
