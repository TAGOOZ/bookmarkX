# Agents

## Rules

1. **Every task must be committed to git after finishing** — Use conventional commits per `docs/CONTRIBUTING.md`
2. **Tests commit separately from impl** when possible — `test(scope): ...` then `feat(scope): ...`
3. **Run lint and tests before committing** — `pnpm lint && pnpm test`

## Commit Convention

```
<type>(<scope>): <description>
```

Types: feat, fix, test, refactor, docs, chore, style

Scopes: db, fetch, classify, ui, main, preload, config

## Workflow

1. Write test first (RED)
2. Write minimal impl (GREEN)
3. Run `pnpm lint && pnpm test`
4. Commit with conventional commit message
