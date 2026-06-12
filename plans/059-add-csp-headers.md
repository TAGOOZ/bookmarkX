# Plan 059: Add Content-Security-Policy headers to BrowserWindow

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/main.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

No Content-Security-Policy is configured anywhere. `src/main.ts` creates BrowserWindow without CSP. Without CSP, if DOMPurify sanitization has a bypass, there's no defense-in-depth against XSS. CSP acts as a second line of defense: even if an attacker injects a `<script>` tag, the browser will refuse to execute it unless it matches the policy.

## Current state

- `src/main.ts` — creates BrowserWindow without CSP headers
- The app loads local files (vite-built renderer) and makes external requests to Google Fonts CDN and Gemini API
- The BlockNote editor uses inline styles

Convention: `src/main.ts` handles all Electron main-process setup. BrowserWindow is created with `webPreferences` options. The app uses `@electron-forge/maker-*` for packaging.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main.ts` — add CSP via `session.defaultSession.webRequest.onHeadersReceived`

**Out of scope**:
- `forge.config.ts` — would affect packaging; CSP in main process is sufficient
- Renderer-side CSP meta tags — not needed when headers are set

## Steps

### Step 1: Add CSP headers via session handler in `src/main.ts`

After the BrowserWindow is created and the `ready` event fires, add a `session.defaultSession.webRequest.onHeadersReceived` handler that sets the CSP header.

The policy:
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self' https://generativelanguage.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
```

Add this after the `app.whenReady()` block or after window creation:

```typescript
import { session } from 'electron';

// After app.whenReady() or after mainWindow creation:
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
      ],
    },
  });
});
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add `webPreferences.csp` to BrowserWindow constructor

Add the `csp` property to `webPreferences` in the BrowserWindow constructor as a secondary defense:

```typescript
const mainWindow = new BrowserWindow({
  // ...
  webPreferences: {
    // ... existing options
    csp: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
  },
});
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass — no behavior change for app logic
- Manual verification: app loads correctly, fonts render, Gemini API calls succeed

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "Content-Security-Policy" src/main.ts` returns a match
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching `forge.config.ts` (out of scope)

## Maintenance notes

- If new external domains are added (e.g., a new API), update the `connect-src` directive
- If inline scripts are needed in the future, add `'unsafe-hashes'` with specific hashes instead of `'unsafe-inline'`
- The `style-src 'unsafe-inline'` is needed for BlockNote editor styles; consider moving to nonces if CSP is tightened later
