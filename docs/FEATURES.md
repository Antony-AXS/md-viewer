# Features

Complete list of MD Viewer features organized by category.

---

## File Discovery & Navigation

- **Auto-scan** — Recursively discovers all `.md` files in the repository at startup
- **File tree** — Hierarchical sidebar with collapsible directories and SVG icons
- **Search** — Real-time filename filtering with fuzzy (typo-tolerant) matching
- **Full-text search** — Searches inside file content, shows matching snippets
- **Command palette** — `Ctrl+P` opens a unified search across files, headings, and actions
- **Recent files** — Collapsible section showing last 5 viewed files, persisted across sessions
- **Bookmarks** — Star files for quick access, collapsible section in sidebar
- **Back/forward navigation** — `Alt+←` / `Alt+→` with full history stack
- **Prev/Next buttons** — Sequential file navigation in sorted order
- **URL hash routing** — Shareable links like `#/docs/guide.md`, browser back/forward works
- **Breadcrumb trail** — Shows current file path above the content

## Markdown Rendering

- **GitHub Flavored Markdown** — Full GFM support via `marked`
- **Syntax highlighting** — Code blocks highlighted via `highlight.js` with language detection
- **Language labels** — Small tag on code blocks showing the language name
- **Mermaid diagrams** — Fenced `mermaid` code blocks render as actual diagrams
- **KaTeX math** — `$inline$` and `$$display$$` LaTeX math rendering
- **Emoji shortcodes** — `:rocket:` → :rocket:, `:fire:` → :fire:, 40+ supported codes
- **Task lists** — `[ ]` and `[x]` render as visual checkboxes
- **Internal link rewriting** — Relative `.md` links navigate within the viewer
- **Collapsible sections** — `<details>/<summary>` HTML rendered with styled expand/collapse
- **Heading anchors** — Hover any heading to reveal a `#` link, click to copy URL

## UI & Theming

- **Dark/light mode** — Toggle with button or persisted preference, includes highlight.js theme swap
- **Collapsible sidebar** — Smooth animated expand/collapse with `Ctrl+B`
- **Resizable sidebar** — Drag the right edge to resize between 180px and 500px
- **Table of contents** — Auto-generated from headings, scroll spy highlights active section
- **Zen mode** — `Ctrl+Shift+Z` hides all UI except the content for focused reading
- **Presentation mode** — Splits content at `---` into slides, navigate with arrow keys
- **Loading spinner** — Shown while fetching file content
- **Fade transitions** — Smooth crossfade when switching between files
- **Scroll position memory** — Returns to where you left off when revisiting a file
- **Responsive layout** — Sidebar becomes overlay on narrow screens

## Developer Tools

- **Copy button** — Appears on hover over code blocks, shows "Copied" feedback
- **Edit in VS Code** — Opens the current file in VS Code via `vscode://` protocol
- **Export to PDF** — Triggers browser print with a clean print stylesheet
- **Word count & reading time** — Shown in the toolbar for the current file
- **File watcher** — Polls every 3 seconds, auto-refreshes content and file list
- **Toast notifications** — Non-intrusive alerts when files are updated
- **File stats dashboard** — Total files, directories, words, average words per file, total reading time

## Sharing & Embedding

- **URL hash routing** — Share links to specific files
- **Embed mode** — Add `?embed=true` to strip the sidebar for iframe use
- **Print stylesheet** — Clean single-column layout for printing
- **Drag and drop** — Drop a `.md` file from your desktop to view it instantly

## Keyboard Shortcuts

See [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) for the full list.
