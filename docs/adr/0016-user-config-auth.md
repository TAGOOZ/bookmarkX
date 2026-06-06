# User Config & Authentication

## Status

Accepted

## Context

BookmarkX is a single-user desktop app. Settings currently live in a flat `.env` file with 4 fields (GEMINI_API_KEY, BIRD_AUTH_TOKEN, BIRD_CT0, BIRD_CHROME_PROFILE). This approach has limitations:
- No user identity (name, Twitter handle)
- No app preferences (theme, language, notifications)
- Manual cookie extraction is tedious
- No auto-detection of Chrome profiles
- `.env` is a dotenv convention — not ideal for app config

We need a unified config approach that handles user identity, auth tokens, and app preferences.

## Decision

### Config Format: Flat JSON (`user.json`)

Single-user app. Flat JSON config file in Electron's userData dir (`~/.config/bookmarkX/user.json`). Chosen over nested JSON, TOML, or YAML for simplicity — no parser library needed, matches JSON usage elsewhere in the codebase.

**Schema:**
```json
{
  "name": "",
  "twitterHandle": "",
  "geminiApiKey": "",
  "birdAuthToken": "",
  "birdCt0": "",
  "birdChromeProfile": "",
  "theme": "dark",
  "language": "ar",
  "notifications": true,
  "fetchFrequency": "0 */6 * * *",
  "aiModel": "gemini-2.0-flash"
}
```

### Authentication: Three Equal Methods

No single primary method — user chooses what works best:

1. **Chrome profile auto-detect** (Linux only for now):
   - Scans `~/.config/google-chrome/` for `Default`, `Profile 1`, `Profile 2`, etc.
   - Extracts `auth_token` and `ct0` from Chrome's `Cookies` SQLite DB (unencrypted on Linux)
   - Auto-fills `birdAuthToken`, `birdCt0`, `birdChromeProfile` in user.json
   - Chrome must be closed during extraction

2. **Twitter login via Electron BrowserWindow**:
   - Opens `x.com/login` in a session-partitioned BrowserWindow
   - User logs in through the official Twitter UI (handles 2FA, captcha)
   - Captures `auth_token` and `ct0` cookies from the session
   - Saves directly to user.json

3. **Manual token entry** (fallback):
   - User extracts cookies from Chrome DevTools > Application > Cookies > x.com
   - Enters `auth_token` and `ct0` in the Settings form

### Settings UI

- Two equal options side by side: "Login with Twitter" button + manual entry fields
- "Detect" button next to Chrome profile field for manual re-detection
- Auto-detect runs on Settings modal open
- Profile section lives in Settings modal (not sidebar)

### Migration

- `.env` file is deleted on first launch after update
- Existing `.env` values are NOT migrated — user configures fresh in user.json
- App works immediately with empty config (no forced setup wizard)
- Subtle prompt banner on first run guides user to complete setup

### First-Run Experience

- App works with empty/missing user.json
- Banner component shows "Complete your setup" with link to Settings
- Banner dismissed permanently after user saves settings once

## Consequences

### Positive
- Single source of truth for all config (auth + preferences + identity)
- Three auth methods cover different skill levels and OSes
- No `.env` dependency — cleaner Electron app convention
- Auto-detect reduces friction for Linux users
- Twitter login handles 2FA/captchas natively

### Negative
- Linux-only Chrome detection (macOS/Windows need keytar for encrypted cookies — future work)
- No multi-user support (by design — single-user personal tool)
- Config file is plaintext (acceptable for a personal desktop app)
- Cookie extraction from Chrome DB requires Chrome to be closed

### Neutral
- bird.fast still reads auth from env vars — we pass user.json values as env vars to the child process
- No schema validation library — we validate on read/write manually
