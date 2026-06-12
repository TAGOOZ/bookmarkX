# Plan 060: Add CI workflow with pnpm check

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- .github/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

No `.github/workflows/` directory exists. `pnpm check` (`pnpm typecheck && pnpm lint && pnpm test`) exists in `package.json` but has no automated enforcement. Contributors can merge code that fails type checking, linting, or tests. A CI workflow catches these issues before they reach main.

## Current state

- No `.github/workflows/` directory exists
- `package.json` defines `check`, `typecheck`, `lint`, and `test` scripts
- The project uses pnpm as its package manager

Convention: the project uses `pnpm` for all package management.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `.github/workflows/ci.yml` (new)

**Out of scope**:
- Deploy workflows
- Release workflows
- Other CI features

## Steps

### Step 1: Create `.github/workflows/` directory

**Verify**: `ls .github/workflows/` → directory exists

### Step 2: Create `ci.yml` with the workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
```

**Verify**: `cat .github/workflows/ci.yml` → file exists with correct content

### Step 3: Validate the YAML is well-formed

**Verify**: `node -e "require('fs').readFileSync('.github/workflows/ci.yml', 'utf8')"` → no error

### Step 4: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass — no code changes, only CI config added
- No new tests required

## Done criteria

- [ ] `.github/workflows/ci.yml` exists
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require changing source code files

## Maintenance notes

- If the project adds more CI steps (deploy, release), create separate workflow files
- If Node version changes, update the `node-version` in the workflow
