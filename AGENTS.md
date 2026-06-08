# Agents

## Rules

1. **Every task must be committed to git after finishing** — Use conventional commits per `docs/CONTRIBUTING.md`
2. **Tests commit separately from impl** when possible — `test(scope): ...` then `feat(scope): ...`
3. **Run lint and tests before committing** — `pnpm lint && pnpm test`
4. **When user says "done" for the session** — Use the `handoff` skill to create a handoff document for the next agent
5. **Before implementing any feature** — Read `CONTEXT.md`, relevant `docs/adr/`, and the handoff doc (if execution session). Never implement blind.
6. **When starting an execution session** — Read the handoff doc first. If it's older than the PRD/ADRs, re-read them too.
7. **When docs conflict** — Check which is most recent. If unclear, ask the user. Never silently ignore a conflict.
8. **Before writing code (Spec Arc)** — Map each user story to files, functions, and components. Identify breaking changes. Write the spec to `docs/specs/` before coding.

## SDLC Workflow

### Phase 1: Discussion & Investigation
- Discuss the feature/problem with the user
- Investigate the codebase to understand current state
- Identify affected files, modules, and dependencies
- Create a handoff document when done (use `handoff` skill)

### Phase 2: Planning & Documentation
- Update PRD with new user stories and acceptance criteria
- Update or create ADRs for architectural decisions
- Ensure PRD, ADR, and handoff are aligned (no contradictions)
- If conflicts exist, ask the user or choose the approach that best fits the domain model

### Phase 3: Architecture & Spec Mapping (Spec Arc)
Before writing any code, translate high-level product desires into granular technical realities:
- Read PRD, ADRs, and handoff to understand the full picture
- Map each user story to specific files, functions, and components
- Identify breaking changes, affected modules, and dependency risks
- Create a technical spec in `docs/specs/<feature-name>.md` with:
  - Files to create/modify
  - Functions to add/change (signatures, I/O types)
  - Database migrations needed
  - Test plan (what to test, how)
- If something conflicts with existing decisions, ask the user before proceeding

### Phase 4: Implementation
- Write tests first (RED)
- Write minimal implementation (GREEN)
- Run `pnpm lint && pnpm test`
- Commit with conventional commit message

## Doc Alignment Rule

PRD, ADRs, and handoff documents must tell the same story. When they diverge:
1. Check which document is most recent
2. If unclear, ask the user which approach to follow
3. Update the outdated document before proceeding
4. Never silently ignore a conflict — it will cause confusion later

## Stale Handoff Rule

When starting an execution session with a handoff doc:
1. Check the handoff's creation timestamp
2. Check PRD and ADR modification dates
3. If PRD/ADRs are newer than the handoff, re-read them before executing
4. The most recent document wins — but ask if the delta is significant

## Commit Convention

```
<type>(<scope>): <description>
```

Types: feat, fix, test, refactor, docs, chore, style

Scopes: db, fetch, classify, ui, main, preload, config, parser
