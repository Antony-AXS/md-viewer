# MD Viewer

A self-contained, feature-rich markdown viewer for browsing documentation in any Node.js repository. Drop it into your project, run `npm start`, and browse all your `.md` files with a clean, professional interface.

## Quick Start

```bash
cd md-viewer
npm install
npm start
```

Open `http://localhost:3030` in your browser. That's it.

## Why MD Viewer?

Most repos accumulate markdown files across dozens of directories — READMEs, API docs, architecture notes, runbooks. MD Viewer automatically discovers all of them and presents them in a searchable, navigable interface with GitHub-style rendering.

No configuration needed. No build step. Just start and browse.

## Features at a Glance

| Category | Highlights |
|----------|-----------|
| Navigation | File tree, search, command palette, bookmarks, recent files, back/forward history |
| Rendering | GFM markdown, syntax highlighting, mermaid diagrams, KaTeX math, emoji shortcodes |
| UI | Dark/light themes, collapsible sidebar, resizable panels, zen mode, presentation mode |
| Developer | Copy code buttons, VS Code integration, file watcher, keyboard shortcuts |
| Sharing | URL hash routing, embed mode, print/PDF export, drag-and-drop |

See [docs/FEATURES.md](docs/FEATURES.md) for the complete feature list.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Command palette |
| `Ctrl+K` | Search files |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+T` | Toggle table of contents |
| `Ctrl+Shift+Z` | Zen mode |
| `Alt+←` / `Alt+→` | Navigate back / forward |
| `Escape` | Close search / palette / presentation |

Full list at [docs/KEYBOARD_SHORTCUTS.md](docs/KEYBOARD_SHORTCUTS.md).

## Configuration

The server runs on port `3030` by default. Override with:

```bash
PORT=4000 npm start
```

For iframe embedding, add `?embed=true` to the URL to hide the sidebar.

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for all options.

## Project Structure

```
md-viewer/
├── server.js          # Express server + API
├── scanner.js         # Recursive .md file discovery
├── public/
│   ├── index.html     # Single-page app shell
│   ├── app.js         # Client-side application
│   └── styles.css     # Dual-theme stylesheet
├── tests/             # Jest + fast-check test suites
├── docs/              # Documentation (you're reading it)
└── backups/           # File backups
```

## Tech Stack

- Express for HTTP serving
- marked for markdown parsing
- highlight.js for syntax highlighting
- mermaid for diagram rendering
- KaTeX for math/LaTeX
- fast-check for property-based testing
- Vanilla JS — no build step, no framework
