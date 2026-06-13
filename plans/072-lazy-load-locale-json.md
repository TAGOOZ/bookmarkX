# Plan 072: Lazy-load inactive locale JSON in renderer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e4bb75e..HEAD -- src/renderer/App.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e4bb75e`, 2026-06-13

## Why this matters

`App.tsx` eagerly imports both `ar.json` and `en.json` locale files (lines 6-7) and bundles them into the `messages` record. Since only one locale is active at a time, the other is dead weight in the initial bundle. For a desktop app this is less critical than for web, but it still increases the renderer's initial parse/eval time.

The fix: dynamically import the locale JSON only when needed, using React's `useIntl` to determine the active locale.

## Current state

- `src/renderer/App.tsx:6-7`:
```typescript
import arMessages from '../../locales/ar.json';
import enMessages from '../../locales/en.json';
```
- `src/renderer/App.tsx:30-33`:
```typescript
const messages: Record<string, Record<string, string>> = {
  ar: arMessages,
  en: enMessages,
};
```
- The `IntlProvider` at line 145 uses `messages[locale]`
- Locale is read from `settingsStore` (localStorage)

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/renderer/App.tsx`

**Out of scope**:
- Locale JSON files (`locales/ar.json`, `locales/en.json`)
- Other renderer components

## Git workflow

- Branch: `advisor/072-lazy-load-locale-json`
- Commit: `perf(renderer): lazy-load inactive locale JSON to reduce initial bundle`

## Steps

### Step 1: Convert to dynamic locale loading

Replace the static imports and the `messages` record with a lazy-loading pattern. Use `React.lazy` or a simple `useEffect` + state pattern to load the locale JSON on demand.

Replace lines 6-7 and 30-33 in `src/renderer/App.tsx` with:

```typescript
// Remove these static imports:
// import arMessages from '../../locales/ar.json';
// import enMessages from '../../locales/en.json';

const localeCache: Record<string, Record<string, string>> = {};

async function loadLocale(locale: string): Promise<Record<string, string>> {
  if (localeCache[locale]) return localeCache[locale];
  const mod = locale === 'ar'
    ? await import('../../locales/ar.json')
    : await import('../../locales/en.json');
  localeCache[locale] = mod.default ?? mod;
  return localeCache[locale];
}
```

Then in `AppContent` (or a new `IntlProviderWrapper`), use a state + effect to load the locale:

```typescript
function AppContent() {
  const locale = useSettingsStore((s) => s.locale);
  const [messages, setMessages] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLocale(locale).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    return () => { cancelled = true; };
  }, [locale]);

  if (!messages) return null; // or a loading spinner

  return (
    <IntlProvider messages={messages} locale={locale} defaultLocale="ar">
      <AppContentInner />
    </IntlProvider>
  );
}
```

Move the existing `AppContent` body into `AppContentInner`. The key change: `IntlProvider` is now a child of the locale-loading wrapper, not at the top level.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Verify tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing renderer tests should pass — they mock `window.api` and don't depend on actual locale loading
- If tests fail due to the async locale loading, add a mock for `../../locales/ar.json` and `../../locales/en.json` in test setup

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "import arMessages" src/renderer/App.tsx` returns no matches
- [ ] `grep -n "import enMessages" src/renderer/App.tsx` returns no matches
- [ ] No files outside `src/renderer/App.tsx` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/renderer/App.tsx` doesn't match the excerpts above
- Tests fail and the fix requires touching test files (STOP and report — may need a separate plan)
- The locale loading causes a visible flash/flicker on startup

## Maintenance notes

- The `localeCache` prevents re-importing on locale switch-back
- Vite will code-split each locale JSON into separate chunks automatically via dynamic `import()`
- If the app grows to support more locales, this pattern scales naturally
- The `cancelled` flag prevents state updates on unmounted components
