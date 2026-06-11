// Express server - serves the frontend and API
const express = require('express');
const path = require('path');
const fs = require('fs');
const { scanMarkdownFiles } = require('./scanner');

const app = express();
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3030;

// Cached file list from startup scan
let cachedFiles = [];

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/files - rescan and return current file list
app.get('/api/files', async (req, res) => {
  try {
    cachedFiles = await scanMarkdownFiles(ROOT_DIR);
  } catch (e) {
    // If rescan fails, fall back to cached list
  }
  res.json({ files: cachedFiles });
});

// GET /api/search?q=query - full-text search across all markdown files
app.get('/api/search', async (req, res) => {
  var query = (req.query.q || '').toLowerCase().trim();
  if (!query || query.length < 2) return res.json({ results: [] });

  var results = [];
  for (var filePath of cachedFiles) {
    try {
      var resolved = path.resolve(ROOT_DIR, filePath);
      var content = await fs.promises.readFile(resolved, 'utf-8');
      var lower = content.toLowerCase();
      var idx = lower.indexOf(query);
      if (idx !== -1) {
        // Extract context around match
        var start = Math.max(0, idx - 60);
        var end = Math.min(content.length, idx + query.length + 60);
        var snippet = (start > 0 ? '…' : '') + content.substring(start, end).replace(/\n/g, ' ') + (end < content.length ? '…' : '');
        results.push({ path: filePath, snippet: snippet });
        if (results.length >= 20) break;
      }
    } catch (e) { /* skip unreadable files */ }
  }
  res.json({ results: results });
});

// GET /api/files/:encodedPath - return raw markdown content
app.get('/api/files/:encodedPath', async (req, res) => {
  let decodedPath;
  try {
    decodedPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
  } catch {
    return res.status(400).json({ error: 'Only .md files are supported' });
  }

  // Validate .md extension
  if (!decodedPath.endsWith('.md')) {
    return res.status(400).json({ error: 'Only .md files are supported' });
  }

  // Validate no path traversal
  const resolved = path.resolve(ROOT_DIR, decodedPath);
  if (!resolved.startsWith(ROOT_DIR + path.sep) && resolved !== ROOT_DIR) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Validate path is in scanned list (rescan if needed)
  if (!cachedFiles.includes(decodedPath)) {
    // File might be new — check if it exists on disk
    try {
      await fs.promises.access(resolved);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
  }

  // Read file from disk
  try {
    const content = await fs.promises.readFile(resolved, 'utf-8');
    res.json({ path: decodedPath, content });
  } catch {
    return res.status(404).json({ error: 'File not found' });
  }
});

// GET /api/open-editor?file=path&editor=nvim|code - open file in editor
app.get('/api/open-editor', (req, res) => {
  var filePath = req.query.file;
  var editor = req.query.editor || 'code';
  if (!filePath || !cachedFiles.includes(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  var resolved = path.resolve(ROOT_DIR, filePath);
  if (!resolved.startsWith(ROOT_DIR + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  var cmd = editor === 'nvim' ? 'nvim' : 'code';
  var args = editor === 'nvim' ? ['--server', '/tmp/nvim.sock', '--remote', resolved] : [resolved];
  try {
    var { spawn } = require('child_process');
    var child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.unref();
    res.json({ ok: true, editor: cmd, file: filePath });
  } catch (e) {
    res.status(500).json({ error: 'Failed to open editor: ' + e.message });
  }
});

// GET /api/export-html?file=path - export a file as self-contained HTML
app.get('/api/export-html', async (req, res) => {
  var filePath = req.query.file;
  if (!filePath || !cachedFiles.includes(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  var resolved = path.resolve(ROOT_DIR, filePath);
  try {
    var content = await fs.promises.readFile(resolved, 'utf-8');
    res.json({ path: filePath, content: content });
  } catch (e) {
    return res.status(404).json({ error: 'File not found' });
  }
});

// GET /api/tags - extract #tags from all files
app.get('/api/tags', async (req, res) => {
  var tagMap = {};
  for (var filePath of cachedFiles) {
    try {
      var resolved = path.resolve(ROOT_DIR, filePath);
      var content = await fs.promises.readFile(resolved, 'utf-8');
      var matches = content.match(/#[a-zA-Z][a-zA-Z0-9_-]{1,30}/g);
      if (matches) {
        matches.forEach(function (tag) {
          var t = tag.toLowerCase();
          if (!tagMap[t]) tagMap[t] = [];
          if (tagMap[t].indexOf(filePath) === -1) tagMap[t].push(filePath);
        });
      }
    } catch (e) {}
  }
  res.json({ tags: tagMap });
});

/**
 * Initialize the server: scan for markdown files and start listening.
 * @returns {Promise<import('http').Server>}
 */
async function start() {
  cachedFiles = await scanMarkdownFiles(ROOT_DIR);
  console.log(`Discovered ${cachedFiles.length} markdown files`);

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`MD Viewer running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

// Start the server when run directly
if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

// Export for testing
module.exports = { app, start, _setCachedFiles: (files) => { cachedFiles = files; } };
