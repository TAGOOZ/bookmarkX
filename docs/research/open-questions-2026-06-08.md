# Research: Open Questions from PRD §11

**Date:** 2026-06-08
**Status:** Draft

---

## 1. Electron Auto-Update Code Signing

### Findings

**electron-updater** (v6.6.2) supports:
- GitHub Releases as update source
- macOS (Squirrel.Mac), Windows (NSIS), Linux (AppImage/rpm/deb)
- Delta updates for smaller download sizes
- Staged rollouts via release channels

**Code Signing Requirements:**

| Platform | Requirement | Cost | Setup |
|----------|-------------|------|-------|
| macOS | Apple Developer ID certificate + notarization | $99/year (Apple Developer Program) | Xcode or `electron-notarize` CLI |
| Windows | EV or OV code signing certificate | $80-500/year (DigiCert, Sectigo, etc.) | SignTool or `electron-builder` integration |
| Linux | Optional GPG signing | Free | GPG key pair |

**electron-forge + publisher-github workflow:**
1. Configure `@electron-forge/publisher-github` in forge.config.ts
2. Set `GH_TOKEN` environment variable (GitHub PAT with `repo` scope)
3. Run `electron-forge publish` to upload artifacts to GitHub Releases
4. Use `update-electron-app` module for open-source apps (free hosting via update.electronjs.org)
5. For private apps: host own update server (nucleus, nuts, hazel)

**Recommendation:**
- Use electron-forge's GitHub publisher for artifact distribution
- Use `update-electron-app` for open-source (free) or `electron-updater` with GitHub provider for private
- macOS notarization required for distribution outside App Store
- Windows EV cert recommended for trust, OV cert minimum

---

## 2. Supabase Project Setup + Schema Migration

### Findings

**Supabase CLI Migration Workflow:**
1. `supabase init` — initialize project with `supabase/` directory
2. `supabase start` — run local Supabase stack via Docker
3. `supabase migration new <name>` — create migration file in `supabase/migrations/<timestamp>_<name>.sql`
4. `supabase db reset` — reset local DB and apply all migrations
5. `supabase db diff` — diff local changes and generate migration
6. `supabase db push` — apply migrations to linked remote project
7. `supabase db lint` — check for schema errors

**Schema Design for Phase 3 (Bookmarks Sync + Vector Embeddings):**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- User sync state
CREATE TABLE user_sync_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  last_sync_at TIMESTAMPTZ,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks (remote copy)
CREATE TABLE remote_bookmarks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  url TEXT NOT NULL,
  title TEXT,
  title_ar TEXT,
  title_en TEXT,
  content_type TEXT,
  topic_id UUID,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync log for conflict resolution
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  bookmark_id UUID REFERENCES remote_bookmarks(id),
  action TEXT CHECK(action IN ('create', 'update', 'delete')),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT
);

-- Index for vector similarity search
CREATE INDEX ON remote_bookmarks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Recommendation:**
- Use Supabase CLI for local development with Docker
- Use `supabase db diff` to capture Dashboard changes as migrations
- Deploy via `supabase db push` to linked project
- Use RLS policies for multi-user data isolation
- pgvector HNSW index for <10ms latency at 5M vectors

---

## 3. Chrome Profile Detection (macOS/Windows)

### Findings

**chrome-cookies-secure** (v3.0.2) — cross-platform cookie extraction:
- macOS: Uses `keytar` to access Keychain for Chrome encryption key
- Windows: Uses `win-dpapi` for DPAPI decryption
- Linux: Reads directly (no encryption)

**Cookie File Locations:**

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Google/Chrome/Default/Cookies` |
| Windows | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Network\Cookies` |
| Linux | `~/.config/google-chrome/Default/Cookies` |

**Chrome v20 App-Bound Encryption (2024+):**
- Chrome 127+ introduced app-bound encryption for cookies
- Requires SYSTEM DPAPI → user DPAPI → AES-GCM/ChaCha20 decryption
- `elevation_service.exe` contains hardcoded keys
- `chrome-cookies-secure` handles this automatically

**Keytar for macOS:**
- `keytar` (v7.9.0) — native Node.js keychain access
- Required for reading Chrome's encryption key from macOS Keychain
- First use prompts user for Keychain Access permission
- Alternative: `@nomiclabs/keytar` maintained fork

**Platform-Specific Considerations:**

| Platform | Encryption | Key Retrieval | Notes |
|----------|-----------|---------------|-------|
| macOS | AES-128-CBC | Keychain via keytar | TCC permission required |
| Windows | AES-256-GCM (v20) | DPAPI + elevation_service | May require admin for v20+ |
| Linux | Plaintext | Direct file read | No encryption |

**Recommendation:**
- Use `chrome-cookies-secure` as primary library (handles v20 encryption)
- Add `keytar` as optional dependency for macOS
- Add `win-dpapi` as optional dependency for Windows
- Detect Chrome profile paths via `os.homedir()` + platform-specific suffixes
- Graceful fallback: if extraction fails, prompt user for manual cookie import

---

## Next Steps

1. **Auto-Update:** Set up electron-forge GitHub publisher in `forge.config.ts`
2. **Supabase:** Create Supabase project, write initial migration for user sync
3. **Chrome Detection:** Test `chrome-cookies-secure` integration, add to fetch pipeline
