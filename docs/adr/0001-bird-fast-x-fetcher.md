# bird.fast as X Fetcher

We use bird.fast (@steipete/bird) CLI for fetching bookmarks from X/Twitter. It talks to X's private GraphQL endpoints using browser session cookies — free, no API key needed, but fragile (undocumented API can break anytime). Chosen over X API v2 ($100/mo) and manual export for zero-cost, near-real-time fetching. Breakage risk is acceptable for a personal tool.

## Authentication Methods

bird.fast supports three auth methods (Phase 0 — see [ADR-0016](0016-user-config-auth.md)):

1. **Chrome profile auto-detect** (recommended on Linux): App scans `~/.config/google-chrome/` for profiles, extracts `auth_token` and `ct0` from Chrome's unencrypted SQLite cookie DB. Passes `--chrome-profile <path>` to bird.fast. Chrome must be closed.
2. **Twitter login via Electron**: Opens `x.com/login` in a session-partitioned BrowserWindow. Captures cookies after login. No manual extraction needed.
3. **Manual token entry** (fallback): User extracts `auth_token` and `ct0` from Chrome DevTools > Application > Cookies > x.com. Passed as env vars (`BIRD_AUTH_TOKEN`, `BIRD_CT0`).

All three methods store tokens in `user.json` (userData dir). bird.fast reads from env vars or `--chrome-profile` flag.
