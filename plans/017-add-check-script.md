# Plan 017: Add typecheck and check scripts to package.json

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

No single command runs all checks. `tsc --noEmit` is never enforced. Developers and agents must remember to run lint and test separately.

## Current state

- `package.json` — scripts section (lines 8-16):
```json
"scripts": {
  "start": "electron-forge start",
  "start:linux": "electron-forge start -- --no-sandbox --disable-features=VaapiVideoDecoder,SharedArrayBuffer",
  "package": "electron-forge package",
  "make": "electron-forge make",
  "publish": "electron-forge publish",
  "lint": "eslint --ext .ts,.tsx .",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

No `typecheck` script. No combined `check` script.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `package.json`

**Out of scope**:
- tsconfig.json changes
- CI/CD config

## Steps

### Step 1: Add typecheck and check scripts

In `package.json`, add to the scripts section:

```json
"typecheck": "tsc --noEmit",
"check": "pnpm typecheck && pnpm lint && pnpm test"
```

**Verify**: `grep -c "typecheck" package.json` → 2 (the script + the check script reference)

### Step 2: Verify typecheck runs

**Verify**: `pnpm typecheck` → exit 0 (or exit with type errors — that's expected and OK for now)

If typecheck fails, that's expected — the tsconfig doesn't have `strict` mode and there may be pre-existing issues. The goal is to make the script available, not fix all type errors in this plan.

### Step 3: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- New scripts are available for developers and agents

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `package.json` has `typecheck` and `check` scripts
- [ ] `pnpm typecheck` runs `tsc --noEmit`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
