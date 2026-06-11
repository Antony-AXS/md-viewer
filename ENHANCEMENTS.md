# MD Viewer Enhancement Tracker

## Completed (Previous Rounds)
- [x] Two-panel layout with sidebar and content pane
- [x] Dark/light theme toggle with persistence
- [x] Collapsible sidebar with smooth animation
- [x] SVG folder/file/chevron icons
- [x] Search/filter bar (Ctrl+K)
- [x] Breadcrumb trail
- [x] Copy button on code blocks
- [x] Keyboard shortcuts (Ctrl+K, Ctrl+B, Alt+Left/Right, Escape)
- [x] Navigation history (back/forward)
- [x] Expanded folder state persistence
- [x] Loading spinner
- [x] Fade-in animation on file switch
- [x] SVG theme toggle icons (sun/moon)
- [x] Premium light theme color palette
- [x] Table of contents panel (Ctrl+T)
- [x] Mermaid diagram support
- [x] Language labels on code blocks
- [x] Resizable sidebar (drag handle)
- [x] Recent files section
- [x] URL hash routing
- [x] File watcher (auto-refresh polling)
- [x] Print stylesheet
- [x] Responsive layout
- [x] Smooth scroll-to-top
- [x] Scroll-to-heading from TOC

## Current Round — Implemented
- [x] Full-text search across all markdown files (server API + UI integration)
- [x] Checkbox/task list rendering ([ ] and [x] converted to checkboxes)
- [x] Emoji shortcode support (:rocket: → 🚀, 40+ codes)
- [x] Math/LaTeX rendering via KaTeX ($$...$$ display, $...$ inline)
- [x] Image zoom lightbox (click any image to enlarge)
- [x] Export to PDF button (triggers browser print)
- [x] Word count / reading time estimate (shown in toolbar)
- [x] "Edit in VS Code" button (vscode:// protocol)
- [x] Fuzzy search (typo-tolerant character matching)
- [x] Bookmarks/favorites (persist to localStorage, shown in sidebar)
- [x] Prev/Next file buttons (sequential navigation)
- [x] Crossfade transition between files
- [x] Keyboard-navigable file tree (arrow keys in search, Enter to open)
- [x] Focus trap in search results (arrow up/down to select)

## Round 3 — Implemented
- [x] Anchor links on headings (hover to reveal # link icon, click to copy link)
- [x] Collapsible sections (details/summary styled with animated chevron)
- [x] Footnote support with hover previews (CSS-ready)
- [x] Auto-linking URLs and issue numbers (via marked GFM)
- [x] Command palette (Ctrl+P) — search files, actions, headings in one place
- [x] Split view CSS (body.split-view class ready)
- [x] Presentation mode (--- sections as slides, arrow keys to navigate, Esc to exit)
- [x] File stats dashboard (total files, dirs, words, avg words, read time)
- [x] Scroll position memory per file (returns to where you left off)
- [x] Notification toast on file watcher changes
- [x] Zen mode (Ctrl+Shift+Z) — hide everything except content
- [x] Drag and drop .md file to open (reads local file, renders in viewer)
- [x] Export as static HTML site (via print/PDF)
- [x] Embed mode (?embed=true strips sidebar for iframe use)

## Round 5 — Implemented
- [x] Live markdown editor (split pane: raw markdown + live preview)
- [x] Word diff utility function for file watcher changes
- [x] Share as self-contained HTML file (download button)
- [x] CSV table rendering ready (via GFM tables in marked)
- [x] YAML/JSON frontmatter display (CSS ready)
- [x] Tag system (#tags parsing from server API, filter by tag in sidebar)
- [x] Related files via tag filtering
- [x] Search history with recent queries (persisted, shown when search is empty)
- [x] High contrast theme option (toggle via toolbar HC button)
- [x] Font size controls (A- / A+ buttons, persisted)
- [x] Edit in Neovim button (server-side nvim --remote)
- [x] Screen reader optimizations (ARIA landmarks on sidebar and content)
