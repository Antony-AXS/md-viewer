# Configuration

MD Viewer is designed to work with zero configuration. Everything below is optional.

---

## Server Port

Default port is `3030`. Override with the `PORT` environment variable:

```bash
PORT=4000 npm start
```

## Embed Mode

Add `?embed=true` to the URL to hide the sidebar and navigation controls. Useful for embedding in iframes:

```html
<iframe src="http://localhost:3030/?embed=true#/docs/guide.md" width="100%" height="600"></iframe>
```

## Deep Linking

Use URL hash routing to link directly to a file:

```
http://localhost:3030/#/docs/FEATURES.md
```

Share these links with teammates — they'll open the exact file.

## Excluded Directories

The scanner automatically excludes:

- `node_modules/` — dependency directories
- `md-viewer/` — the viewer itself

These are hardcoded in `scanner.js`. To exclude additional directories, modify the `excludeDirs` parameter in the `scanMarkdownFiles` call in `server.js`.

## Persistence

MD Viewer stores user preferences in the browser's `localStorage`:

| Key | What it stores |
|-----|---------------|
| `md-viewer-theme` | `light` or `dark` |
| `md-viewer-sidebar` | `expanded` or `collapsed` |
| `md-viewer-expanded` | Array of expanded folder names |
| `md-viewer-recent` | Array of recently viewed file paths |
| `md-viewer-bookmarks` | Array of bookmarked file paths |
| `md-viewer-recent-collapsed` | Whether the Recent section is collapsed |
| `md-viewer-bookmarks-collapsed` | Whether the Bookmarks section is collapsed |

Clear localStorage to reset all preferences.

## File Watcher

The viewer polls the server every 3 seconds for changes. When a file is modified on disk, the content auto-refreshes and a toast notification appears. This is useful during active documentation writing.

The polling interval is set in `app.js` in the `startFileWatcher` function. Adjust the `setInterval` value to change the frequency.

## Print / PDF Export

Click the printer icon in the toolbar or use `Ctrl+P`. The print stylesheet hides all navigation UI and renders the content in a clean single-column layout. Links show their URLs in parentheses.

## VS Code Integration

The "Edit in VS Code" button uses the `vscode://` protocol to open the current file. This works when VS Code is installed and registered as a URL handler on your system.
