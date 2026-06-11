# Changelog

All notable changes to MD Viewer.

---

## Round 1 — Foundation

Initial implementation from the spec-driven development workflow.

- Project scaffold with Express, marked, highlight.js
- Recursive markdown file scanner with exclusion rules
- REST API: file list, file content with path validation
- File tree sidebar with collapsible directories
- GitHub Flavored Markdown rendering with syntax highlighting
- Internal `.md` link rewriting for in-viewer navigation
- Two-panel layout with independent scrolling
- Welcome message with file count
- Property-based tests (6 properties) and unit tests (34 total)

## Round 2 — Polish & UX

Visual and interaction improvements.

- Dark/light theme toggle with localStorage persistence
- Collapsible sidebar with smooth CSS animation
- SVG icons for files, folders, chevrons, theme toggle
- Premium color palette for light mode
- Search bar with `Ctrl+K` shortcut and debounced filtering
- Breadcrumb trail showing current file path
- Copy button on code blocks with "Copied" feedback
- Keyboard shortcuts: `Ctrl+K`, `Ctrl+B`, `Alt+←/→`, `Escape`
- Navigation history with back/forward support
- Expanded folder state persistence
- Loading spinner during file fetch
- Fade-in animation on file switch
- Table of contents panel with scroll spy (`Ctrl+T`)
- Mermaid diagram rendering via CDN
- Language labels on code blocks
- Resizable sidebar via drag handle
- Recent files section in sidebar
- URL hash routing with shareable links
- File watcher with 3-second polling
- Print stylesheet for clean PDF output
- Responsive layout for narrow screens
- Smooth scroll-to-top on file switch

## Round 3 — Power Features

Advanced content and developer experience features.

- Full-text search across all markdown file content
- Checkbox/task list rendering (`[ ]` and `[x]`)
- Emoji shortcode support (40+ codes)
- KaTeX math/LaTeX rendering (inline and display)
- Image zoom lightbox
- Export to PDF button
- Word count and reading time estimate
- "Edit in VS Code" button
- Fuzzy search (typo-tolerant matching)
- Bookmarks/favorites with persistence
- Prev/Next file navigation buttons
- Crossfade transition between files
- Keyboard-navigable file tree (arrow keys in search)
- Focus trap in search results

## Round 4 — Pro Features

Collaboration, advanced content, and power user features.

- Anchor links on headings (hover to reveal, click to copy URL)
- Collapsible `<details>/<summary>` sections
- Command palette (`Ctrl+P`) — unified search for files, headings, actions
- Presentation mode (split at `---`, arrow key navigation)
- File stats dashboard (files, dirs, words, reading time)
- Scroll position memory per file
- Toast notifications on file watcher changes
- Zen mode (`Ctrl+Shift+Z`) — distraction-free reading
- Drag and drop `.md` files to view
- Embed mode (`?embed=true` for iframes)
- Collapsible Recent and Bookmarks sidebar sections
- Dynamic bookmark tooltip (shows "Remove bookmark" when bookmarked)
