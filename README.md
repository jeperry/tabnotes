# TabNotes

A Chrome extension that lets you annotate any open tab with a plain-text note. TabNotes automatically captures where each tab came from and when it was opened, so you never forget why a tab is sitting there.

## Features

- **Per-tab notes** — add a plain-text annotation to any open tab via the toolbar popup
- **Automatic context capture** — records the referring page (opener tab) and navigation type (link click, typed/pasted URL, bookmark, etc.)
- **Timestamps** — tracks when each tab was first opened with relative time display
- **Badge indicator** — a small dot on the extension icon shows which tabs have notes
- **All Notes view** — browse and search every annotated tab in one page
- **Auto-save** — notes save automatically as you type
- **Light & dark mode** — follows your system preference
- **No account required** — everything is stored locally in your browser

## Getting Started

### Install from source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `tabnotes` project folder
5. The TabNotes icon will appear in your toolbar — click it on any tab to start adding notes

### Usage

- Click the **TabNotes icon** in the Chrome toolbar to open the popup for the current tab
- Type a note in the text area — it saves automatically
- The popup shows metadata: when the tab was opened, where it came from, and how it was opened (link, typed/pasted, bookmark, etc.)
- Click **All notes** at the bottom of the popup to see every annotated tab in a searchable list

## How It Works

TabNotes uses Chrome's `tabs` and `webNavigation` APIs to listen for new tab events. When a tab is created, the extension records:

| Field | Source |
|---|---|
| Opener URL & title | `tab.openerTabId` / `webNavigation.onCreatedNavigationTarget` |
| Navigation type | `webNavigation.onCommitted` `transitionType` (link, typed, bookmark…) |
| Timestamp | `Date.now()` at tab creation |

Notes and metadata are stored in `chrome.storage.local`, keyed by URL so they survive tab restores and re-opens.

> **Clipboard detection:** Chrome extensions cannot directly read the clipboard. When a URL is typed or pasted into the address bar, Chrome reports a `transitionType` of `"typed"`, which TabNotes surfaces as "typed / pasted."

## Project Structure

```
tabnotes/
├── manifest.json        # Chrome extension manifest (MV3)
├── src/
│   ├── background.js    # Service worker — captures tab context
│   ├── storage.js       # Async wrappers for chrome.storage.local
│   ├── popup.html       # Toolbar popup shell
│   ├── popup.js         # Popup logic — note editor + metadata
│   ├── popup.css        # Popup + shared styles
│   └── notes.html       # Full-page "All Notes" view
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE
└── README.md
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Commit your changes
4. Push to your fork and open a pull request

## License

[MIT](LICENSE)
