# Internationalization & Bidirectional Layout

The app supports Arabic (RTL) and English (LTR) UI languages. Language choice drives layout direction — the entire app chrome (nav panel, tabs, headings, buttons) mirrors when switching languages. Bookmark content direction remains independent (BlockNote handles mixed AR/EN bidirectionally).

Separate JSON translation files (`locales/ar.json`, `locales/en.json`) hold all UI strings. Every hardcoded string is converted to `intl.formatMessage()`. CSS uses logical properties (`padding-inline-start`, `margin-inline-end`, `border-inline-start`) instead of physical ones, so layout flips automatically when the parent `dir` attribute changes.

Locale state lives in React context, persisted to `user.json`. Changing language triggers an app restart via a prompt (Restart Now / Later). The `<html>` element's `dir` and `lang` attributes are managed by a React component reading the locale context.

Bookmark titles are stored as dual columns (`title_ar`, `title_en`) with fallback to the other language when the preferred one is NULL. NavPanel position flips with language: Arabic → right, English → left. BookmarkTabs direction follows UI language, not content detection.

**Considered options:**
- Separate JSON files (chosen) vs inline translations vs partial extraction — JSON files are the standard `react-intl` pattern, scalable, and maintainable.
- Logical CSS properties (chosen) vs CSS class overrides — logical properties are the modern CSS standard, require no per-component maintenance.
- React context + user.json (chosen) vs Electron store vs Zustand — simple, one source of truth, no IPC complexity.
- App restart with prompt (chosen) vs live swap vs next-launch-only — restart avoids hot-swap edge cases while the prompt gives users control.
- Two title columns (chosen) vs translations table vs JSON column — simple, explicit, no JOIN complexity.

**Consequences:**
- All future components must use `intl.formatMessage()` for user-visible strings — no hardcoded text allowed.
- All future CSS must use logical properties — `padding-left` and `border-right` are prohibited.
- The `bookmarks` table schema changes (title → title_ar + title_en) requiring a migration.
- Adding a third language later requires only a new JSON file and a Settings option — no code changes.
