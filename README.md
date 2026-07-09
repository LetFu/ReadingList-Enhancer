# ReadingList Enhancer

[Chinese README](./README.zh-CN.md)

ReadingList Enhancer is a Chrome MV3 extension that improves the native Chrome Reading List with a focused side panel: search, filters, sorting, local tags, and JSON/URL import and export.

## Features

- Search, filter, and sort Reading List entries.
- Add the current page, or add pages and links from the context menu.
- Mark entries read or unread, and delete entries.
- Select existing local tags for entries, or create new tags.
- Import and export project JSON backups, or export all/current-result URLs as plain text.

## Installation

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project directory.
5. Click the extension action to open the side panel.

## Requirements

- Chrome 120 or later.
- No build step and no dependencies.
- `manifest.json` includes a locally generated `key`, so unpacked installs use the stable extension ID `nianajlkiccjcfbegngpmhpinggjkbef`.

## Permissions

- `readingList`: manage the native Chrome Reading List.
- `sidePanel`: show the side panel UI.
- `contextMenus`: add right-click save actions.
- `activeTab`: read the current page title and URL after the user triggers the extension.
- `storage`: store the local URL-to-tags mapping.

The extension does not request `host_permissions`, inject content scripts, or upload data. See [PRIVACY.md](./PRIVACY.md).

## Development Checks

```sh
python3 -m json.tool manifest.json >/dev/null
node --check background.js
node --check sidepanel/data.js
node --check sidepanel/panel.js
node tests/data.test.js
sh -n scripts/package-extension.sh
scripts/package-extension.sh
```

## Release

GitHub Release, Chrome Web Store upload, and changelog steps are documented in [RELEASE.md](./RELEASE.md) and [CHANGELOG.md](./CHANGELOG.md).

## License

MIT. See [LICENSE](./LICENSE).
