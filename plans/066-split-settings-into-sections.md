# Plan 066: Split Settings.tsx into section components

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/renderer/components/Settings.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: readability
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Settings.tsx is 493 lines with 7 useState hooks, 3 useEffect hooks, and 5 useCallback hooks. It handles four independent form sections (User Profile, X/Twitter Auth, Gemini API, Preferences) plus loading state, error handling, restart prompt, and form submission. Each section is ~50-80 lines of JSX that could be its own component. Splitting makes each section independently testable and easier to modify.

## Current state

- `src/renderer/components/Settings.tsx:1-493` — the monolith
- User Profile section: lines 251-282
- X/Twitter Auth section: lines 284-372
- Gemini API Key section: lines 374-392
- Preferences section: lines 394-473
- Form submission: lines 157-176
- Chrome detect / Twitter login handlers: lines 108-155

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/components/Settings.tsx` (modify — extract sections)
- New: `src/renderer/components/settings/` directory with section components

**Out of scope**:
- Settings CSS modules
- Backend config (src/main/user-config.ts)
- Other renderer components

## Git workflow

- Branch: `advisor/066-split-settings`
- Commit: `refactor(ui): extract Settings into section components`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create shared types file

Create `src/renderer/components/settings/types.ts` with the shared `SettingsFormData` interface and `DEFAULT_FORM` constant. Both the parent and child components need these.

```typescript
export interface SettingsFormData {
  name: string; twitterHandle: string; geminiApiKey: string;
  birdAuthToken: string; birdCt0: string; birdChromeProfile: string;
  theme: 'dark' | 'light'; language: 'ar' | 'en';
  notifications: boolean; fetchFrequency: string; aiModel: string;
}

export const DEFAULT_FORM: SettingsFormData = {
  name: '', twitterHandle: '', geminiApiKey: '',
  birdAuthToken: '', birdCt0: '', birdChromeProfile: '',
  theme: 'dark', language: 'ar', notifications: true,
  fetchFrequency: '0 */6 * * *', aiModel: 'gemini-2.0-flash',
};
```

**Verify**: `pnpm typecheck` exits 0

### Step 2: Create UserProfileSection component

Extract lines 251-282 into `src/renderer/components/settings/UserProfileSection.tsx`. Props: `formData`, `onChange`, `disabled`.

**Verify**: `pnpm typecheck` exits 0

### Step 3: Create TwitterAuthSection component

Extract lines 284-372 into `src/renderer/components/settings/TwitterAuthSection.tsx`. This section has local state (`detecting`, `twitterLogging`, `authStatus`) and handlers (`handleDetectChrome`, `handleTwitterLogin`). Props: `formData`, `onChange`, `disabled`.

**Verify**: `pnpm typecheck` exits 0

### Step 4: Create GeminiApiSection component

Extract lines 374-392 into `src/renderer/components/settings/GeminiApiSection.tsx`. Props: `formData`, `onChange`, `disabled`.

**Verify**: `pnpm typecheck` exits 0

### Step 5: Create PreferencesSection component

Extract lines 394-473 into `src/renderer/components/settings/PreferencesSection.tsx`. Props: `formData`, `onChange`, `disabled`.

**Verify**: `pnpm typecheck` exits 0

### Step 6: Refactor Settings.tsx to compose sections

Rewrite Settings.tsx to import and compose the section components. Keep: form state, loading/error/restart logic, form submission, keyboard handling. Remove: all extracted JSX sections. The component should shrink from 493 lines to ~180 lines.

**Verify**: `pnpm typecheck` exits 0, `pnpm lint` exits 0

### Step 7: Run full verification

Run `pnpm check`.

**Verify**: `pnpm check` exits 0

## Test plan

- No existing tests for Settings.tsx (confirmed by grep)
- No new tests required — pure refactor
- Manual verification: Settings opens, all sections render, save works, language change triggers restart prompt

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] Settings.tsx is under 200 lines
- [ ] `src/renderer/components/settings/` directory exists with 4 section components + types.ts
- [ ] No behavior change
- [ ] `plans/README.md` status row updated

## STOP conditions

- A section component has different behavior than the original JSX
- A step's verification fails twice
- The fix requires modifying Settings.module.css
