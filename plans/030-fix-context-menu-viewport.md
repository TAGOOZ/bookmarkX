# Plan 030: Fix context menu to stay within viewport bounds

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
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

The context menu is positioned using `style={{ top: contextMenu.y, left: contextMenu.x }}`
directly from `e.clientX`/`e.clientY`. When the user right-clicks near the
bottom or right edge of the viewport, the menu renders partially or fully
off-screen, making items unreachable.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — context menu rendering (lines 268-308)

Code:
```tsx
{contextMenu?.visible && (
  <div
    ref={menuRef}
    className={styles.contextMenu}
    style={{ top: contextMenu.y, left: contextMenu.x }}
    role="menu"
  >
```

- `src/renderer/components/bookmark-detail/BookmarkTabs.module.css` — context menu styles (lines 111-120):
```css
.contextMenu {
  position: fixed;
  z-index: 1000;
  /* ... */
  min-width: 180px;
}
```

Convention: CSS uses CSS custom properties (`var(--space-xs)`, etc.) from the design system.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — clamp menu position
- `src/renderer/components/bookmark-detail/BookmarkTabs.module.css` — add RTL-aware menu positioning (optional, for plan 030 bonus)

**Out of scope**:
- Store changes — none
- SplitLayout — unchanged

## Git workflow

- Commit: `fix(ui): clamp context menu within viewport bounds`

## Steps

### Step 1: Clamp context menu position

In `BookmarkTabs.tsx`, change the context menu state to store clamped values.
The cleanest approach: clamp in the render, not in the state setter, so we
don't need to measure the menu before showing it.

Replace the `style` prop on the context menu:

Before:
```tsx
style={{ top: contextMenu.y, left: contextMenu.x }}
```

After — add a clamping helper and use it:
```tsx
// Add near the top of the component, after state declarations:
const menuRef = useRef<HTMLDivElement>(null);

// Replace the style prop:
style={{
  top: Math.min(contextMenu.y, window.innerHeight - 300),
  left: Math.min(contextMenu.x, window.innerWidth - 200),
}}
```

The `300` and `200` are conservative estimates for menu height/width. The
menu has `min-width: 180px` and each item is ~32px tall, max ~8 items = ~256px.
Add padding for safety.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add RTL-aware positioning for context menu

When `dir === 'rtl'`, the menu should open to the left of the click point
(not to the right). Update the style:

```tsx
style={{
  top: Math.min(contextMenu.y, window.innerHeight - 300),
  [dir === 'rtl' ? 'right' : 'left']: dir === 'rtl'
    ? window.innerWidth - contextMenu.x
    : Math.min(contextMenu.x, window.innerWidth - 200),
}}
```

Wait — `style` doesn't support dynamic property names like this in TSX.
Use a plain object approach:

```tsx
const menuStyle: React.CSSProperties = {
  top: Math.min(contextMenu.y, window.innerHeight - 300),
};
if (dir === 'rtl') {
  menuStyle.right = window.innerWidth - contextMenu.x;
} else {
  menuStyle.left = Math.min(contextMenu.x, window.innerWidth - 200);
}
```

Then: `style={menuStyle}`

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass (they don't test viewport clamping directly)
- Plan 031 will add a test for context menu positioning

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Context menu does not render off-screen when right-clicking near edges
- [ ] Context menu opens to the left in RTL mode
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- If the context menu gains more items or becomes taller, the `300` magic number should be replaced with a measured value. A future improvement could use `useLayoutEffect` to measure after render and reposition.
