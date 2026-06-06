# SQLite + Supabase for Data Storage

Local-first SQLite for speed and zero-config. Supabase (Postgres) for cloud sync to enable future mobile access. libSQL built-in vectors for local vector embeddings (replaces sqlite-vec per ADR-0011), pgvector for cloud. Chosen over Turso (user unfamiliar) and pure cloud DB (needs offline support).
