# Plan 088: Enhance CI pipeline with security, coverage, and build checks

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: infrastructure
- **Planned at**: 2026-06-14

## Why this matters

Current CI only runs `pnpm check` (typecheck + lint + test) on Node 18. No security scanning, no coverage reporting, no build verification, no dependency updates.

## Changes

### 1. Dependabot (`.github/dependabot.yml`)
- Auto-update npm dependencies weekly
- Auto-update GitHub Actions weekly

### 2. CodeQL (`.github/workflows/codeql.yml`)
- GitHub's built-in security scanning for JS/TS
- Runs on push to main + PRs + weekly schedule

### 3. Enhanced CI (`.github/workflows/ci.yml`)
- **Node matrix**: test on Node 18 + 20
- **Coverage**: vitest coverage with `@vitest/coverage-v8`
- **Build check**: `electron-forge make` to catch packaging breaks
- Separate jobs for typecheck, lint, test, build

### 4. Vitest coverage config (`vitest.config.ts`)
- Add coverage provider config
- Add coverage thresholds (optional)

## Files to create/modify

- `.github/dependabot.yml` (new)
- `.github/workflows/codeql.yml` (new)
- `.github/workflows/ci.yml` (rewrite)
- `vitest.config.ts` (new)
- `package.json` — add `@vitest/coverage-v8` devDep, add `test:coverage` script

## Verification

- Push to a branch, open PR, verify all CI jobs pass
- Check Dependabot PRs appear after first weekly run
- Check CodeQL runs on push
