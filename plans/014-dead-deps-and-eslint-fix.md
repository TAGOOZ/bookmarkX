# Plan 014: Remove dead dependency and enable import/no-unresolved

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- package.json .eslintrc.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: deps + dx
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

1. `@mozilla/readability` is in `package.json` but never imported — dead ~50KB dependency.
2. `import/no-unresolved` ESLint rule is disabled — broken imports, typos, and circular deps are never caught.

## Current state

- `package.json:63` — `"@mozilla/readability": "^0.6.0"` in dependencies
- `.eslintrc.json:17` — `"import/no-unresolved": "off"`

ADR-0015 says `@mozilla/readability` was "Replaced" by Defuddle.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `package.json` (remove dead dep)
- `.eslintrc.json` (enable rule)

**Out of scope**:
- Other dependencies
- Fixing any errors that enabling the rule surfaces (separate plan)

## Steps

### Step 1: Remove @mozilla/readability

```bash
pnpm remove @mozilla/readability
```

**Verify**: `grep "@mozilla/readability" package.json` → no match

### Step 2: Enable import/no-unresolved

In `.eslintrc.json`, change line 17 from:
```json
"import/no-unresolved": "off"
```
to:
```json
"import/no-unresolved": "error"
```

**Verify**: `grep "no-unresolved" .eslintrc.json` → shows `"error"`

### Step 3: Check for lint errors

Run lint and see if enabling the rule surfaces broken imports:

**Verify**: `pnpm lint 2>&1 | head -30` → check for `import/no-unresolved` errors

If errors appear, fix them (they indicate genuinely broken imports that should be fixed).

### Step 4: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- Dead dependency removed
- Broken imports now caught at lint time

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `@mozilla/readability` not in `package.json`
- [ ] `import/no-unresolved` set to `"error"` in `.eslintrc.json`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Enabling the rule surfaces more than 10 broken imports (too many to fix in this plan — report back)
