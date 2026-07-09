# AGENTS.md

## Working Style

- Deliver user-facing responses in Chinese by default. Keep code identifiers and Chrome API terms in English.
- Read the real code and official APIs before editing files. Do not expand permissions or invent models by guesswork.
- Prefer YAGNI, KISS, and DRY. Delete when possible. Use native Chrome APIs before adding dependencies.
- Keep changes narrowly scoped. Do not add a build chain, framework, cloud sync, or custom database unless the feature requires it.

## Chrome Extension Constraints

- This project is a Chrome Manifest V3 extension that enhances the native Chrome Reading List.
- `chrome.readingList` is the source of truth. Do not copy the Reading List into custom storage unless a feature explicitly needs extra metadata.
- Keep permissions minimal. When adding `permissions`, `optional_permissions`, `host_permissions`, or `content_scripts`, update the permission notes in `README.md` and `PRIVACY.md`.
- MV3 service worker listeners must be registered at top level, not inside async callbacks or `onInstalled`.
- Do not load remote code, add telemetry, or upload the user's Reading List.

## UI and Safety

- Render user titles, URLs, and search terms with DOM APIs and `textContent`. Do not concatenate user content into `innerHTML`.
- The side panel is a tool UI, not a marketing page. Avoid explanatory filler.
- Add batch actions, tags, reminders, import/export, or full-text capture only when there is a real requirement. Check the permission cost first.

## Verification

- After editing `manifest.json`, run `python3 -m json.tool manifest.json`.
- After editing JS, run `node --check background.js` and `node --check sidepanel/panel.js`.
- Release notes and changelog are managed by `git-cliff`. Commit messages must use scoped Conventional Commits, such as `feat(sidepanel): add unread filter`, `fix(background): handle duplicate URL`, `docs(release): update release steps`, or `ci(release): package extension on tag`.
- Browser automation needs escalated browser/Playwright in this local Codex environment because Chrome/Chromium fails inside the default sandbox.
