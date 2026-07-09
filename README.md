# 🦊 MyNoteFoxy

> Persistent Markdown notepad on your Firefox new tab page.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Firefox](https://img.shields.io/badge/firefox-142%2B-ff7139)](https://addons.mozilla.org/...)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

## ✨ Features

- **Markdown editor** with live side-by-side preview
- **Search** with result highlighting (Ctrl+F)
- **Export** as `.md` or `.txt`
- **Zen mode** for distraction-free writing
- **Task lists** with clickable checkboxes
- **Auto-save** with status indicator
- **Dark mode** — automatically follows system preference
- **Resizable panels** — drag the divider to adjust editor/preview ratio
- **Context menu** — send selected text directly to your note
- **Keyboard shortcuts** — Ctrl+B (bold), Ctrl+I (italic), Ctrl+F (search)
- 100% local — **no data is ever sent to any server**

## 📸 Screenshots

<img width="1265" height="914" alt="Screenshot_2026-07-09_18-09-22" src="https://github.com/user-attachments/assets/72e0688d-5c94-41ee-a07f-d027127453d6" />

## 🚀 Installation

### Via AMO (recommended)

on review...
<!-- [Install from Firefox Add-ons Store](https://addons.mozilla.org/.../mynotefoxy) -->

### From source (temporary)

1. Clone the repository
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click **"Load Temporary Add-on"**
4. Select the `manifest.json` file

## ⌨️ Keyboard shortcuts

| Shortcut       | Action                         |
|----------------|--------------------------------|
| `Ctrl+B`       | Bold (`**text**`)              |
| `Ctrl+I`       | Italic (`*text*`)              |
| `Ctrl+F`       | Toggle search                  |
| `Escape`       | Close search / exit Zen mode   |
| `Tab`          | Insert 2 spaces                |

## 🧱 Built with

- **Firefox WebExtensions API** (Manifest V3)
- **Custom Markdown parser** — zero external dependencies
- **CSS custom properties** — automatic dark/light mode
- **Vanilla JavaScript** — no frameworks or libraries

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an [issue](https://github.com/jozadaquebatista/MyNoteFoxy/issues) or submit a PR.

## 📄 License

MIT © [Jozadaque Batista](LICENSE)
