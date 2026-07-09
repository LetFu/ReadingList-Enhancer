# Privacy

ReadingList Enhancer does not collect, upload, or sell user data.

## Data Handling

- Reading List data comes from Chrome's native `chrome.readingList` API.
- The extension only reads and modifies the user's Chrome Reading List inside the local browser.
- The extension does not use servers, send network requests, or include telemetry or analytics code.
- The extension does not store a separate copy of the Reading List.
- The extension only uses `chrome.storage.local` to store the local URL-to-tags mapping.

## Permissions

- `readingList`: read and manage the native Chrome Reading List.
- `sidePanel`: provide the side panel UI.
- `contextMenus`: provide right-click actions for saving pages or links.
- `activeTab`: read the current page URL and title after the user triggers the extension.
- `storage`: store tag metadata locally. It is not uploaded or synced.

## User Control

Users can modify or delete entries in Chrome's Reading List at any time, and can remove this extension from `chrome://extensions`.

Last updated: 2026-07-08
