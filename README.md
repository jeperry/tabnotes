<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="TabNotes icon">
</p>

<h1 align="center">TabNotes</h1>

<p align="center">
  <strong>Remember why every tab is open.</strong><br>
  A Chrome extension that lets you annotate any tab with a plain-text note,<br>
  while automatically capturing where it came from and when it was opened.
</p>

<p align="center">
  <a href="#getting-started"><strong>Install</strong></a> · <a href="#features"><strong>Features</strong></a> · <a href="#how-it-works"><strong>How It Works</strong></a> · <a href="#contributing"><strong>Contributing</strong></a>
</p>

---

## Features

- **Per-tab notes** — add a plain-text annotation to any open tab via the toolbar popup
- **Tab title marker** — annotated tabs show a `✎` prefix in the tab strip so you can spot them at a glance
- **Noted Tabs navigator** — quickly list and jump to any open tab that has a note
- **Automatic context capture** — records the referring page (opener tab) and navigation type (link click, typed/pasted URL, bookmark, etc.)
- **Timestamps** — tracks when each tab was first opened with relative time display
- **Badge indicator** — a small dot on the extension icon shows when the current tab has a note
- **All Notes archive** — browse and search every note you've ever written, grouped by open and closed tabs, with per-note cleanup
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
- Annotated tabs get a **✎** prefix in the tab strip so you can spot them without clicking anything
- Switch to the **Noted Tabs** view in the popup to see all open tabs with notes and jump to any of them
- Click **All notes** at the bottom of the popup to open a searchable archive of every note, including closed tabs

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
│   ├── popup.js         # Popup logic — note editor, noted tabs list
│   ├── popup.css        # Popup + shared styles
│   ├── notes.html       # Full-page "All Notes" archive
│   └── notes.js         # All Notes page logic
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
