# @libsql/client as Local SQLite Driver

Replaces `better-sqlite3` + `sqlite-vec` with `@libsql/client` (Turso/libSQL). Solves the Electron 42 native build failure (better-sqlite3@12.10.0 rolled back Electron 42 prebuilds per PR #1470) and removes the need for `sqlite-vec` (libSQL has built-in vector indexes). Chosen over `node:sqlite` (no loadable extensions, no built-in vectors) and Electron 33.x downgrade (delays other Electron upgrades). Local-first, zero-config, single-file backup preserved. Cloud stays on Supabase Postgres + pgvector per ADR-0002.
