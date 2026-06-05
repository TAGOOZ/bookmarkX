# Contributing to BookmarkX

## Commit Convention

We use **Conventional Commits** for all changes. Every commit must be small, focused, and follow this format:

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type | Use For |
|------|---------|
| `feat` | New feature (vertical slice) |
| `fix` | Bug fix |
| `test` | Adding or updating tests (no impl change) |
| `refactor` | Code restructuring (no behavior change) |
| `docs` | Documentation only |
| `chore` | Build, deps, config, tooling |
| `style` | Formatting, whitespace (no logic change) |

### Scopes

| Scope | Area |
|-------|------|
| `db` | SQLite schema, migrations, queries |
| `fetch` | bird.fast integration, X bookmark fetching |
| `classify` | AI classification (priority, topics, reading time) |
| `ui` | React components, layout, styling |
| `main` | Electron main process |
| `preload` | Preload scripts, IPC bridge |
| `config` | Project config, forge, vite, ts |

### Rules

1. **One logical change per commit** — no mixed concerns
2. **Tests commit separately from impl** when possible (`test(db): ...` then `feat(db): ...`)
3. **Description is imperative mood** — "add schema" not "added schema"
4. **Max 72 chars** for subject line
5. **Reference issues** when applicable — `feat(fetch): add bird.fast integration (#12)`

### Examples

```
feat(db): add bookmarks table schema
test(db): add bookmark insert and query tests
feat(fetch): implement bird.fast CLI wrapper
chore: add electron-forge with vite-typescript template
docs: add commit convention to CONTRIBUTING.md
```
