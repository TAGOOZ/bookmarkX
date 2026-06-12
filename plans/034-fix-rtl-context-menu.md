# Plan 034: Fix RTL context menu positioning

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a7e3553..HEAD -- src/renderer/components/bookmark-detail/BookmarkTabs.tsx src/renderer/components/bookmark-detail/BookmarkTabs.module.css`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 030
- **Category**: bug
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

The context menu always opens to the right of the cursor (using `left` CSS
property). In RTL mode, the menu should open to the LEFT of the cursor, as
the user expects the menu to flow with the reading direction. This is handled
in plan 030's viewport clamping, but the CSS also needs an RTL override for
the menu's alignment.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — context menu position (line 272)
- `src/renderer/components/bookmark-detail/BookmarkTabs.module.css` — context menu styles (lines 111-120)

CSS:
```css
.contextMenu {
  position: fixed;
  z-index: 1000;
  background-color: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: var(--space-xs) 0;
  min-width: 180px;
}
```

The `dir` prop is available on the component but not applied to the context menu.

Convention: RTL styles use the `.rtl` class pattern (see `.tabBar.rtl`).

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — pass dir to context menu
- `src/renderer/components/bookmark-detail/BookmarkTabs.module.css` — add RTL positioning

**Out of scope**:
- Plan 030 handles viewport clamping; this plan handles RTL alignment direction

## Git workflow

- Commit: `fix(ui): position context menu correctly in RTL mode`

## Steps

### Step 1: Add RTL class to context menu

In `BookmarkTabs.tsx`, add the dir-based class to the context menu:

Before:
```tsx
<div
  ref={menuRef}
  className={styles.contextMenu}
  style={{ top: contextMenu.y, left: contextMenu.x }}
  role="menu"
>
```

After (incorporating plan 030's viewport clamping):
```tsx
const menuStyle: React.CSSProperties = {
  top: Math.min(contextMenu.y, window.innerHeight - 300),
};
if (dir === 'rtl') {
  menuStyle.right = window.innerWidth - contextMenu.x;
} else {
  menuStyle.left = Math.min(contextMenu.x, window.innerWidth - 200);
}

// ...in the JSX:
<div
  ref={menuRef}
  className={`${styles.contextMenu} ${dir === 'rtl' ? styles.rtl : ''}`}
  style={menuStyle}
  role="menu"
>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add RTL CSS for context menu

In `BookmarkTabs.module.css`, add:

```css
.contextMenu.rtl {
  direction: rtl;
  text-align: right;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests pass
- Manual verification: in RTL mode, right-click a tab → menu opens to the left of cursor

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Context menu has RTL class when `dir="rtl"`
- [ ] Context menu opens to the left of cursor in RTL mode
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- Plan 030 has not been applied yet (dependency)

## Maintenance notes

- This plan depends on plan 030 for the viewport clamping logic. Apply 030 first, then this plan replaces the `style` prop with the RTL-aware version.
