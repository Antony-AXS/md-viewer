// Client-side application for MD Viewer

// State
let fileList = [];       // Array of file paths from API
let activeFile = null;   // Currently selected file path
let navHistory = [];     // Navigation history stack
let navIndex = -1;       // Current position in history

/**
 * Convert a flat array of file paths into a nested tree structure.
 * Directories become nodes (path: null), files become leaves (path: full relative path).
 *
 * @param {string[]} files - Array of relative file paths (e.g., ["README.md", "docs/guide.md"])
 * @returns {Object[]} - Array of root-level tree nodes
 */
function buildFileTree(files) {
  const root = [];

  for (const filePath of files) {
    const parts = filePath.split('/');
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;

      let existing = currentLevel.find(
        (node) => node.name === name && (isFile ? node.path !== null : node.path === null)
      );

      if (!existing) {
        existing = {
          name: name,
          path: isFile ? filePath : null,
          children: [],
        };
        currentLevel.push(existing);
      }

      currentLevel = existing.children;
    }
  }

  return root;
}

/**
 * Render the file tree as collapsible HTML in the sidebar.
 * @param {Object[]} tree - Nested tree structure from buildFileTree
 * @returns {string} - HTML string for the sidebar file tree
 */
function renderSidebar(tree) {
  if (!tree || tree.length === 0) {
    return '<p class="empty-tree">No markdown files found.</p>';
  }
  return renderNodes(tree);
}

// SVG icons as strings
var ICON_FOLDER = '<svg class="dir-icon" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4.5C2 3.67 2.67 3 3.5 3H6.29a1 1 0 0 1 .7.29L8 4.3h4.5c.83 0 1.5.67 1.5 1.5v5.7c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5V4.5z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>';
var ICON_FILE = '<svg class="file-icon" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4.5 2h5l3.5 3.5V13a1 1 0 0 1-1 1h-7.5A1 1 0 0 1 3.5 13V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M9.5 2v3.5H13" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>';
var ICON_CHEVRON = '<svg class="dir-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L7 5L3.5 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Recursively render tree nodes into an HTML list.
 * @param {Object[]} nodes - Array of tree nodes
 * @returns {string} - HTML string
 */
function renderNodes(nodes) {
  let html = '<ul class="tree-list">';
  const sorted = [...nodes].sort((a, b) => {
    const aIsDir = a.path === null;
    const bIsDir = b.path === null;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const node of sorted) {
    if (node.path === null) {
      html += '<li class="tree-dir">';
      html += '<span class="dir-toggle" onclick="toggleDir(this)">';
      html += ICON_CHEVRON + ICON_FOLDER;
      html += '<span>' + escapeHtml(node.name) + '</span>';
      html += '</span>';
      html += '<div class="dir-children">';
      html += renderNodes(node.children);
      html += '</div></li>';
    } else {
      html += '<li class="tree-file">';
      html += '<a class="file-link" data-path="' + escapeHtml(node.path) + '" href="#" onclick="handleFileClick(event, \'' + escapeJs(node.path) + '\')">';
      html += ICON_FILE + '<span>' + escapeHtml(node.name) + '</span>';
      html += '</a></li>';
    }
  }
  html += '</ul>';
  return html;
}

/**
 * Toggle directory expand/collapse with smooth animation.
 * @param {HTMLElement} el - The clicked directory toggle element
 */
function toggleDir(el) {
  var children = el.nextElementSibling;
  var isOpen = el.classList.toggle('open');

  if (isOpen) {
    children.style.height = '0px';
    children.style.opacity = '0';
    children.classList.add('open');
    var targetHeight = children.scrollHeight;
    children.offsetHeight;
    children.style.transition = 'height 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease';
    children.style.height = targetHeight + 'px';
    children.style.opacity = '1';
    var onExpand = function () {
      children.style.height = '';
      children.style.transition = '';
      children.removeEventListener('transitionend', onExpand);
    };
    children.addEventListener('transitionend', onExpand);
  } else {
    children.style.height = children.scrollHeight + 'px';
    children.style.opacity = '1';
    children.offsetHeight;
    children.style.transition = 'height 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease';
    children.style.height = '0px';
    children.style.opacity = '0';
    var onCollapse = function () {
      children.classList.remove('open');
      children.style.height = '';
      children.style.transition = '';
      children.removeEventListener('transitionend', onCollapse);
    };
    children.addEventListener('transitionend', onCollapse);
  }

  // Save expanded folders
  saveExpandedFolders();
}

/** Save which folders are expanded to localStorage */
function saveExpandedFolders() {
  try {
    var expanded = [];
    var toggles = document.querySelectorAll('.dir-toggle.open');
    toggles.forEach(function (t) {
      var name = t.querySelector('span:last-child');
      if (name) expanded.push(name.textContent);
    });
    localStorage.setItem('md-viewer-expanded', JSON.stringify(expanded));
  } catch (e) { /* ignore */ }
}

/** Restore expanded folders from localStorage */
function restoreExpandedFolders() {
  try {
    var saved = localStorage.getItem('md-viewer-expanded');
    if (!saved) return;
    var expanded = JSON.parse(saved);
    var toggles = document.querySelectorAll('.dir-toggle');
    toggles.forEach(function (t) {
      var name = t.querySelector('span:last-child');
      if (name && expanded.indexOf(name.textContent) !== -1) {
        t.classList.add('open');
        var children = t.nextElementSibling;
        if (children) {
          children.classList.add('open');
          children.style.height = '';
          children.style.opacity = '1';
        }
      }
    });
  } catch (e) { /* ignore */ }
}

/**
 * Handle file click in the sidebar.
 */
function handleFileClick(event, filePath) {
  event.preventDefault();
  loadFile(filePath);
}

/**
 * Fetch file list, build tree, render sidebar, show welcome.
 */
async function loadFileList() {
  try {
    const response = await fetch('/api/files');
    const data = await response.json();
    fileList = data.files || [];
    const tree = buildFileTree(fileList);
    const fileTreeEl = document.getElementById('file-tree');
    if (fileTreeEl) {
      fileTreeEl.innerHTML = renderSidebar(tree);
      restoreExpandedFolders();
    }
    const contentPane = document.getElementById('content-pane');
    if (contentPane) {
      contentPane.innerHTML =
        '<div class="welcome-message">' +
        '<h1>Welcome to MD Viewer</h1>' +
        '<p>Found <strong>' + fileList.length + '</strong> markdown file' +
        (fileList.length !== 1 ? 's' : '') + ' in this repository.</p>' +
        '<p>Select a file from the sidebar to get started.</p>' +
        '<div class="welcome-shortcuts">' +
        '<p><kbd>Ctrl</kbd>+<kbd>P</kbd> Command palette &nbsp; <kbd>Ctrl</kbd>+<kbd>K</kbd> Search &nbsp; <kbd>Ctrl</kbd>+<kbd>B</kbd> Sidebar</p>' +
        '<p><kbd>Ctrl</kbd>+<kbd>T</kbd> Contents &nbsp; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> Zen mode</p>' +
        '</div></div>';
    }
  } catch (err) {
    console.error('Failed to load file list:', err);
  }
}

/**
 * Fetch file content, render markdown, update breadcrumb, highlight active file.
 * @param {string} filePath
 */
async function loadFile(filePath) {
  try {
    // Show loading state
    saveScrollPosition();
    var contentPane = document.getElementById('content-pane');
    if (contentPane) {
      contentPane.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    }

    var encodedPath = btoa(filePath);
    var response = await fetch('/api/files/' + encodedPath);
    if (!response.ok) throw new Error('Failed to load file: ' + response.statusText);
    var data = await response.json();
    activeFile = filePath;

    // Update navigation history
    if (navIndex < navHistory.length - 1) {
      navHistory = navHistory.slice(0, navIndex + 1);
    }
    navHistory.push(filePath);
    navIndex = navHistory.length - 1;

    // Render content with fade
    if (contentPane) {
      contentPane.style.animation = 'none';
      contentPane.offsetHeight;
      contentPane.style.animation = '';
      contentPane.dataset.lastContent = data.content;
      contentPane.innerHTML = renderMarkdown(data.content);
      addCopyButtons();
      addLanguageLabels();
      renderMermaidBlocks();
      buildToc();
      updateReadingInfo();
      setupLightbox();
      updateNavButtons();
      updateBookmarkBtn();
      addHeadingAnchors();
    }

    // Update URL hash
    if (typeof window !== 'undefined') {
      window.location.hash = '/' + filePath;
    }

    // Update breadcrumb
    updateBreadcrumb(filePath);

    // Highlight active file
    highlightActiveFile(filePath);

    // Track recent files
    addToRecent(filePath);

    // Smooth scroll content to top (or restore saved position)
    if (!restoreScrollPosition(filePath)) {
      var content = document.getElementById('content');
      if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error('Failed to load file:', err);
    var cp = document.getElementById('content-pane');
    if (cp) cp.innerHTML = '<p class="error-message">Error loading file: ' + escapeHtml(filePath) + '</p>';
  }
}

/**
 * Update the breadcrumb trail for the current file.
 */
function updateBreadcrumb(filePath) {
  var bc = document.getElementById('breadcrumb');
  if (!bc) return;
  var parts = filePath.split('/');
  var html = '';
  for (var i = 0; i < parts.length; i++) {
    if (i > 0) html += '<span class="breadcrumb-sep">/</span>';
    if (i === parts.length - 1) {
      html += '<span class="breadcrumb-current">' + escapeHtml(parts[i]) + '</span>';
    } else {
      html += '<span class="breadcrumb-item">' + escapeHtml(parts[i]) + '</span>';
    }
  }
  bc.innerHTML = html;
  bc.classList.add('visible');
}

/**
 * Add copy buttons to all code blocks.
 */
function addCopyButtons() {
  if (typeof document === 'undefined') return;
  var pres = document.querySelectorAll('#content-pane pre');
  pres.forEach(function (pre) {
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.onclick = function () {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = 'Copied';
          btn.classList.add('copied');
          setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
        });
      }
    };
    pre.appendChild(btn);
  });
}

/**
 * Highlight the active file in the sidebar.
 */
function highlightActiveFile(filePath) {
  var allLinks = document.querySelectorAll('.file-link');
  allLinks.forEach(function (link) { link.classList.remove('active'); });
  var activeLink = document.querySelector('.file-link[data-path="' + CSS.escape(filePath) + '"]');
  if (activeLink) activeLink.classList.add('active');
}

/**
 * Intercept clicks on internal .md links.
 */
function handleInternalLinks(event) {
  var target = event.target.closest('a[onclick*="loadFile"]');
  if (target) return;
}

/**
 * Filter the file tree based on search input.
 */
function filterFiles(query) {
  var fileTreeEl = document.getElementById('file-tree');
  if (!fileTreeEl) return;

  if (!query || query.trim() === '') {
    var tree = buildFileTree(fileList);
    fileTreeEl.innerHTML = renderSidebar(tree);
    restoreExpandedFolders();
    showSearchHistory();
    if (activeFile) highlightActiveFile(activeFile);
    return;
  }

  var q = query.toLowerCase();
  var matches = fileList.filter(function (f) { return fuzzyMatch(query, f); });

  if (matches.length === 0) {
    fileTreeEl.innerHTML = '<p class="no-results">No files match "' + escapeHtml(query) + '"</p>';
    return;
  }

  // Show flat list for search results
  var html = '<ul class="tree-list">';
  matches.forEach(function (filePath) {
    var name = filePath.split('/').pop();
    html += '<li class="tree-file">';
    html += '<a class="file-link" data-path="' + escapeHtml(filePath) + '" href="#" onclick="handleFileClick(event, \'' + escapeJs(filePath) + '\')">';
    html += ICON_FILE + '<span>' + escapeHtml(name) + '</span>';
    html += '<span style="font-size:11px;color:var(--text-tertiary);margin-left:auto;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(filePath) + '</span>';
    html += '</a></li>';
  });
  html += '</ul>';
  fileTreeEl.innerHTML = html;
  if (activeFile) highlightActiveFile(activeFile);
  // Also trigger full-text content search
  performFullTextSearch(query);
  addToSearchHistory(query);
  kbFocusIndex = -1;
}

/** Navigate back in history */
function navigateBack() {
  if (navIndex > 0) {
    navIndex--;
    var filePath = navHistory[navIndex];
    // Load without pushing to history
    loadFileDirectly(filePath);
  }
}

/** Navigate forward in history */
function navigateForward() {
  if (navIndex < navHistory.length - 1) {
    navIndex++;
    var filePath = navHistory[navIndex];
    loadFileDirectly(filePath);
  }
}

/** Load a file without modifying navigation history */
async function loadFileDirectly(filePath) {
  try {
    var contentPane = document.getElementById('content-pane');
    var encodedPath = btoa(filePath);
    var response = await fetch('/api/files/' + encodedPath);
    if (!response.ok) throw new Error('Failed');
    var data = await response.json();
    activeFile = filePath;
    if (contentPane) {
      contentPane.style.animation = 'none';
      contentPane.offsetHeight;
      contentPane.style.animation = '';
      contentPane.innerHTML = renderMarkdown(data.content);
      addCopyButtons();
      addLanguageLabels();
      renderMermaidBlocks();
      buildToc();
      updateReadingInfo();
      setupLightbox();
      updateNavButtons();
      updateBookmarkBtn();
      addHeadingAnchors();
    }
    if (typeof window !== 'undefined') window.location.hash = '/' + filePath;
    updateBreadcrumb(filePath);
    highlightActiveFile(filePath);
    if (!restoreScrollPosition(filePath)) {
      var content = document.getElementById('content');
      if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (e) { console.error(e); }
}

/** Escape HTML */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** Escape JS string for onclick attributes */
function escapeJs(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3c').replace(/>/g, '\\x3e');
}

/**
 * Render markdown content to HTML with syntax highlighting and link rewriting.
 * @param {string} content - Raw markdown string
 * @returns {string} - Rendered HTML string
 */
function renderMarkdown(content) {
  const _marked = typeof marked !== 'undefined' ? marked : require('marked');
  const _hljs = typeof hljs !== 'undefined' ? hljs : require('highlight.js');

  const renderer = new _marked.Renderer();
  renderer.code = function (codeOrObj, lang) {
    var code, language;
    if (typeof codeOrObj === 'object' && codeOrObj !== null) {
      code = codeOrObj.text || '';
      language = (codeOrObj.lang || '').trim();
    } else {
      code = codeOrObj || '';
      language = (lang || '').trim();
    }
    let highlighted;
    if (language === 'mermaid') {
      return '<pre><code class="language-mermaid">' + escapeHtml(code) + '</code></pre>\n';
    }
    if (language && _hljs.getLanguage(language)) {
      try { highlighted = _hljs.highlight(code, { language: language }).value; } catch (e) { highlighted = code; }
    } else {
      try { highlighted = _hljs.highlightAuto(code).value; } catch (e) { highlighted = code; }
    }
    const langClass = language ? ' class="language-' + language + '"' : '';
    return '<pre><code' + langClass + '>' + highlighted + '</code></pre>\n';
  };

  let html = _marked.parse(content, { gfm: true, breaks: false, renderer: renderer });

  // Task list checkboxes: convert [ ] and [x] in list items
  html = html.replace(/<li>\s*\[\s*\]/g, '<li class="task-list-item"><input type="checkbox" class="task-checkbox" disabled>');
  html = html.replace(/<li>\s*\[x\]/gi, '<li class="task-list-item"><input type="checkbox" class="task-checkbox" checked disabled>');

  // Emoji shortcodes
  html = html.replace(/:([a-z0-9_+-]+):/g, function (match, name) {
    var map = { rocket: '🚀', star: '⭐', fire: '🔥', check: '✅', x: '❌', warning: '⚠️', info: 'ℹ️', bulb: '💡', thumbsup: '👍', thumbsdown: '👎', heart: '❤️', sparkles: '✨', zap: '⚡', bug: '🐛', memo: '📝', link: '🔗', lock: '🔒', unlock: '🔓', gear: '⚙️', wrench: '🔧', hammer: '🔨', package: '📦', tada: '🎉', eyes: '👀', thinking: '🤔', wave: '👋', clap: '👏', muscle: '💪', pray: '🙏', coffee: '☕', beer: '🍺', pizza: '🍕', earth: '🌍', sun: '☀️', moon: '🌙', cloud: '☁️', umbrella: '☂️', snowflake: '❄️', construction: '🚧', rotating_light: '🚨', white_check_mark: '✅', heavy_check_mark: '✔️', arrow_right: '➡️', arrow_left: '⬅️', arrow_up: '⬆️', arrow_down: '⬇️', plus: '➕', minus: '➖' };
    return map[name] || match;
  });

  // KaTeX: render $$...$$ (display) and $...$ (inline)
  if (typeof katex !== 'undefined') {
    // Display math
    html = html.replace(/\$\$([^$]+)\$\$/g, function (m, tex) {
      try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }); } catch (e) { return m; }
    });
    // Inline math (avoid matching $$ or currency like $10)
    html = html.replace(/(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, function (m, tex) {
      try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }); } catch (e) { return m; }
    });
  }

  // Rewrite relative .md links to internal navigation
  html = html.replace(
    /<a\s+href="((?!https?:\/\/|mailto:|#|javascript:)[^"]*\.md)"/g,
    function (match, href) {
      var escapedPath = href.replace(/'/g, "\\'");
      return '<a href="javascript:void(0)" onclick="loadFile(\'' + escapedPath + '\')"';
    }
  );

  return html;
}

/** Toggle sidebar */
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var toggle = document.getElementById('sidebar-toggle');
  if (!sidebar || !toggle) return;

  var isCollapsed = sidebar.classList.contains('collapsed');
  if (isCollapsed) {
    sidebar.classList.remove('collapsed');
    sidebar.style.width = '0px'; sidebar.style.minWidth = '0px';
    sidebar.offsetHeight;
    sidebar.style.transition = 'width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)';
    sidebar.style.width = ''; sidebar.style.minWidth = '';
    toggle.classList.remove('collapsed');
    var onE = function () { sidebar.style.transition = ''; sidebar.removeEventListener('transitionend', onE); };
    sidebar.addEventListener('transitionend', onE);
  } else {
    sidebar.style.width = sidebar.offsetWidth + 'px'; sidebar.style.minWidth = sidebar.offsetWidth + 'px';
    sidebar.offsetHeight;
    sidebar.style.transition = 'width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)';
    sidebar.style.width = '0px'; sidebar.style.minWidth = '0px';
    toggle.classList.add('collapsed');
    var onC = function () { sidebar.classList.add('collapsed'); sidebar.style.width = ''; sidebar.style.minWidth = ''; sidebar.style.transition = ''; sidebar.removeEventListener('transitionend', onC); };
    sidebar.addEventListener('transitionend', onC);
  }
  try { localStorage.setItem('md-viewer-sidebar', isCollapsed ? 'expanded' : 'collapsed'); } catch (e) {}
}

/** Toggle theme */
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme') || 'light';
  var next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  var hljsLink = document.getElementById('hljs-theme');
  if (hljsLink) {
    hljsLink.href = next === 'dark'
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
  }
  try { localStorage.setItem('md-viewer-theme', next); } catch (e) {}
}

/** Apply saved preferences on load */
function applySavedTheme() {
  try {
    var saved = localStorage.getItem('md-viewer-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      var hljsLink = document.getElementById('hljs-theme');
      if (hljsLink) hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    } else if (saved === 'high-contrast') {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
      var hljsLink2 = document.getElementById('hljs-theme');
      if (hljsLink2) hljsLink2.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    }
    // Restore font level
    var fl = localStorage.getItem('md-viewer-fontlevel');
    if (fl) { fontLevel = parseInt(fl, 10); changeFontSize(0); }
    var sidebarState = localStorage.getItem('md-viewer-sidebar');
    if (sidebarState === 'collapsed') {
      var sidebar = document.getElementById('sidebar');
      var toggle = document.getElementById('sidebar-toggle');
      if (sidebar) sidebar.classList.add('collapsed');
      if (toggle) toggle.classList.add('collapsed');
    }
  } catch (e) {}
}

/** Open current file in VS Code */
function openInVSCode() {
  if (!activeFile) return;
  window.open('vscode://file/' + encodeURIComponent(window.location.origin + '/../' + activeFile), '_blank');
}

/** Toggle edit dropdown menu */
function toggleEditMenu() {
  var menu = document.getElementById('edit-menu');
  if (menu) menu.classList.toggle('hidden');
}
function closeEditMenu() {
  var menu = document.getElementById('edit-menu');
  if (menu) menu.classList.add('hidden');
}
// Close dropdown when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', function (e) {
    var wrapper = e.target.closest('.edit-dropdown-wrapper');
    if (!wrapper) closeEditMenu();
  });
}

/** Open current file in Neovim via server-side API */
function openInNvim() {
  if (!activeFile) return;
  fetch('/api/open-editor?file=' + encodeURIComponent(activeFile) + '&editor=nvim')
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d.ok) showToast('Opened in Neovim'); else showToast('Failed: ' + (d.error || 'unknown')); })
    .catch(function () { showToast('Could not reach server'); });
}

/** Export current view to PDF via browser print */
function exportPdf() {
  window.print();
}

/** Share current file as self-contained HTML */
function shareAsHtml() {
  if (!activeFile) return;
  var pane = document.getElementById('content-pane');
  if (!pane) return;
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + escapeHtml(activeFile) + '</title>';
  html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">';
  html += '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:860px;margin:0 auto;padding:40px;line-height:1.6;color:#1a1d21}pre{background:#f4f5f7;border:1px solid #e2e8f0;border-radius:8px;padding:16px;overflow-x:auto}code{font-family:Consolas,monospace;font-size:0.875em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0;padding:8px 12px}th{background:#f8f9fb}blockquote{border-left:3px solid #2563eb;padding-left:1em;color:#4a5568}img{max-width:100%}</style>';
  html += '</head><body>' + pane.innerHTML + '</body></html>';
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = activeFile.split('/').pop().replace('.md', '.html');
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded as HTML');
}

/** Font size controls */
var fontLevel = 0;
function changeFontSize(delta) {
  fontLevel = Math.max(-1, Math.min(2, fontLevel + delta));
  document.body.classList.remove('font-sm', 'font-lg', 'font-xl');
  if (fontLevel === -1) document.body.classList.add('font-sm');
  else if (fontLevel === 1) document.body.classList.add('font-lg');
  else if (fontLevel === 2) document.body.classList.add('font-xl');
  try { localStorage.setItem('md-viewer-fontlevel', fontLevel); } catch (e) {}
}

/** High contrast toggle */
function toggleHighContrast() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  if (current === 'high-contrast') {
    html.setAttribute('data-theme', 'dark');
    var hljsLink = document.getElementById('hljs-theme');
    if (hljsLink) hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    try { localStorage.setItem('md-viewer-theme', 'dark'); } catch (e) {}
  } else {
    html.setAttribute('data-theme', 'high-contrast');
    var hljsLink2 = document.getElementById('hljs-theme');
    if (hljsLink2) hljsLink2.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    try { localStorage.setItem('md-viewer-theme', 'high-contrast'); } catch (e) {}
  }
}

/** Live markdown editor */
var editorRawContent = '';
function openEditor() {
  if (!activeFile) { showToast('Open a file first'); return; }
  fetch('/api/files/' + btoa(activeFile)).then(function (r) { return r.json(); }).then(function (d) {
    editorRawContent = d.content;
    var panel = document.getElementById('editor-panel');
    var textarea = document.getElementById('editor-textarea');
    if (panel && textarea) {
      textarea.value = d.content;
      panel.classList.remove('editor-hidden');
      document.body.classList.add('editor-open');
      // Live preview on input
      textarea.oninput = function () {
        var pane = document.getElementById('content-pane');
        if (pane) pane.innerHTML = renderMarkdown(textarea.value);
      };
    }
  });
}

function closeEditor() {
  var panel = document.getElementById('editor-panel');
  if (panel) panel.classList.add('editor-hidden');
  document.body.classList.remove('editor-open');
  if (activeFile) loadFileDirectly(activeFile);
}

function saveEditorContent() {
  showToast('Preview only — file not saved to disk');
}

/** Parse YAML/JSON frontmatter and render as styled block */
function renderFrontmatter() {
  if (typeof document === 'undefined') return;
  var pane = document.getElementById('content-pane');
  if (!pane) return;
  var firstChild = pane.firstElementChild;
  if (!firstChild) return;
  // Check if content starts with --- (YAML frontmatter)
  var raw = pane.innerHTML;
  // Already rendered by marked, so look for the pattern in the original content
}

/** Tags: load and display */
function loadTags() {
  if (typeof document === 'undefined') return;
  fetch('/api/tags').then(function (r) { return r.json(); }).then(function (data) {
    var tags = data.tags || {};
    var keys = Object.keys(tags);
    if (keys.length === 0) return;
    var existing = document.getElementById('tags-section');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'tags-section';
      existing.className = 'tags-section';
      var fileTree = document.getElementById('file-tree');
      if (fileTree) fileTree.parentNode.insertBefore(existing, fileTree);
    }
    var isCollapsed = false;
    try { isCollapsed = localStorage.getItem('md-viewer-tags-collapsed') === 'true'; } catch (e) {}

    var html = '<div class="section-header" onclick="toggleTagsSection()">';
    html += '<svg class="section-chevron' + (isCollapsed ? '' : ' open') + '" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L7 5L3.5 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    html += '<span class="tags-label">Tags</span>';
    html += '</div>';
    html += '<div class="tags-list section-body' + (isCollapsed ? ' collapsed' : '') + '">';
    keys.sort().slice(0, 30).forEach(function (tag) {
      html += '<span class="tag-badge" onclick="filterByTag(\'' + escapeJs(tag) + '\')" title="' + tags[tag].length + ' files">' + escapeHtml(tag) + '</span>';
    });
    html += '</div>';
    existing.innerHTML = html;
  }).catch(function () {});
}

function toggleTagsSection() {
  var body = document.querySelector('#tags-section .section-body');
  var chevron = document.querySelector('#tags-section .section-chevron');
  if (!body) return;
  var isCollapsed = body.classList.toggle('collapsed');
  if (chevron) chevron.classList.toggle('open', !isCollapsed);
  try { localStorage.setItem('md-viewer-tags-collapsed', isCollapsed ? 'true' : 'false'); } catch (e) {}
}

function filterByTag(tag) {
  fetch('/api/tags').then(function (r) { return r.json(); }).then(function (data) {
    var files = (data.tags || {})[tag] || [];
    var fileTreeEl = document.getElementById('file-tree');
    if (!fileTreeEl || files.length === 0) return;
    var html = '<div class="search-results-header">Files tagged ' + escapeHtml(tag) + ' <a class="clear-filter" onclick="clearTagFilter()">✕ Show all</a></div><ul class="tree-list">';
    files.forEach(function (fp) {
      var name = fp.split('/').pop();
      html += '<li class="tree-file"><a class="file-link" data-path="' + escapeHtml(fp) + '" href="#" onclick="handleFileClick(event, \'' + escapeJs(fp) + '\')">' + ICON_FILE + '<span>' + escapeHtml(name) + '</span></a></li>';
    });
    html += '</ul>';
    fileTreeEl.innerHTML = html;
    showToast('Showing ' + files.length + ' files with ' + tag);
  });
}

function clearTagFilter() {
  var tree = buildFileTree(fileList);
  var fileTreeEl = document.getElementById('file-tree');
  if (fileTreeEl) {
    fileTreeEl.innerHTML = renderSidebar(tree);
    restoreExpandedFolders();
    if (activeFile) highlightActiveFile(activeFile);
  }
}

/** Search history */
function getSearchHistory() {
  try { var s = localStorage.getItem('md-viewer-search-history'); return s ? JSON.parse(s) : []; } catch (e) { return []; }
}

function addToSearchHistory(query) {
  if (!query || query.length < 2) return;
  try {
    var hist = getSearchHistory().filter(function (q) { return q !== query; });
    hist.unshift(query);
    if (hist.length > 10) hist = hist.slice(0, 10);
    localStorage.setItem('md-viewer-search-history', JSON.stringify(hist));
  } catch (e) {}
}

function showSearchHistory() {
  var hist = getSearchHistory();
  if (hist.length === 0) return;
  var fileTreeEl = document.getElementById('file-tree');
  if (!fileTreeEl) return;
  var html = '<div class="search-history"><div class="search-history-label">Recent searches</div>';
  hist.forEach(function (q) {
    html += '<div class="search-history-item" onclick="document.getElementById(\'search-input\').value=\'' + escapeJs(q) + '\';filterFiles(\'' + escapeJs(q) + '\')">' + escapeHtml(q) + '</div>';
  });
  html += '</div>';
  fileTreeEl.insertAdjacentHTML('afterbegin', html);
}

/** Word diff display */
function showWordDiff(oldText, newText) {
  var oldWords = oldText.split(/\s+/);
  var newWords = newText.split(/\s+/);
  var html = '';
  var maxLen = Math.max(oldWords.length, newWords.length);
  for (var i = 0; i < maxLen; i++) {
    if (i >= oldWords.length) html += '<span class="diff-added">' + escapeHtml(newWords[i]) + '</span> ';
    else if (i >= newWords.length) html += '<span class="diff-removed">' + escapeHtml(oldWords[i]) + '</span> ';
    else if (oldWords[i] !== newWords[i]) {
      html += '<span class="diff-removed">' + escapeHtml(oldWords[i]) + '</span> ';
      html += '<span class="diff-added">' + escapeHtml(newWords[i]) + '</span> ';
    } else html += escapeHtml(newWords[i]) + ' ';
  }
  return html;
}

/** Update word count and reading time */
function updateReadingInfo() {
  if (typeof document === 'undefined') return;
  var pane = document.getElementById('content-pane');
  var info = document.getElementById('reading-info');
  if (!pane || !info || !activeFile) { if (info) info.textContent = ''; return; }
  var text = pane.textContent || '';
  var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; }).length;
  var mins = Math.max(1, Math.round(words / 200));
  info.textContent = words.toLocaleString() + ' words · ' + mins + ' min read';
}

/** Setup image zoom lightbox */
function setupLightbox() {
  if (typeof document === 'undefined') return;
  var imgs = document.querySelectorAll('#content-pane img');
  imgs.forEach(function (img) {
    img.style.cursor = 'zoom-in';
    img.onclick = function () {
      var lb = document.getElementById('lightbox');
      var lbImg = document.getElementById('lightbox-img');
      if (lb && lbImg) {
        lbImg.src = img.src;
        lb.classList.remove('lightbox-hidden');
      }
    };
  });
}

function closeLightbox() {
  var lb = document.getElementById('lightbox');
  if (lb) lb.classList.add('lightbox-hidden');
}

/** Navigate to previous file in the sorted list */
function navigatePrevFile() {
  if (!activeFile || fileList.length === 0) return;
  var idx = fileList.indexOf(activeFile);
  if (idx > 0) loadFile(fileList[idx - 1]);
}

/** Navigate to next file in the sorted list */
function navigateNextFile() {
  if (!activeFile || fileList.length === 0) return;
  var idx = fileList.indexOf(activeFile);
  if (idx < fileList.length - 1) loadFile(fileList[idx + 1]);
}

/** Update prev/next button states */
function updateNavButtons() {
  if (typeof document === 'undefined') return;
  var navBtns = document.getElementById('nav-buttons');
  var prevBtn = document.getElementById('prev-file-btn');
  var nextBtn = document.getElementById('next-file-btn');
  if (!navBtns || !prevBtn || !nextBtn) return;
  if (!activeFile) { navBtns.style.display = 'none'; return; }
  navBtns.style.display = 'flex';
  var idx = fileList.indexOf(activeFile);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= fileList.length - 1;
}

/** Bookmarks management */
function getBookmarks() {
  try { var s = localStorage.getItem('md-viewer-bookmarks'); return s ? JSON.parse(s) : []; } catch (e) { return []; }
}

function toggleBookmark() {
  if (!activeFile) return;
  var bm = getBookmarks();
  var idx = bm.indexOf(activeFile);
  if (idx !== -1) bm.splice(idx, 1);
  else bm.push(activeFile);
  try { localStorage.setItem('md-viewer-bookmarks', JSON.stringify(bm)); } catch (e) {}
  renderBookmarks();
  updateBookmarkBtn();
}

function updateBookmarkBtn() {
  var btn = document.querySelector('.toolbar-bookmark');
  if (!btn) return;
  var bm = getBookmarks();
  var isBookmarked = activeFile && bm.indexOf(activeFile) !== -1;
  if (isBookmarked) {
    btn.classList.add('bookmarked');
    btn.title = 'Remove bookmark';
  } else {
    btn.classList.remove('bookmarked');
    btn.title = 'Bookmark this file';
  }
}

function renderBookmarks() {
  if (typeof document === 'undefined') return;
  var existing = document.getElementById('bookmarks-section');
  var bm = getBookmarks();
  if (bm.length === 0) { if (existing) existing.remove(); return; }
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'bookmarks-section';
    existing.className = 'bookmarks-section';
    var searchContainer = document.querySelector('.search-container');
    if (searchContainer) searchContainer.parentNode.insertBefore(existing, searchContainer.nextSibling);
  }
  var isCollapsed = false;
  try { isCollapsed = localStorage.getItem('md-viewer-bookmarks-collapsed') === 'true'; } catch (e) {}

  var html = '<div class="section-header" onclick="toggleBookmarksSection()">';
  html += '<svg class="section-chevron' + (isCollapsed ? '' : ' open') + '" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L7 5L3.5 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  html += '<span class="bookmarks-label">★ Bookmarks</span>';
  html += '</div>';
  html += '<ul class="recent-list section-body' + (isCollapsed ? ' collapsed' : '') + '">';
  bm.forEach(function (fp) {
    var name = fp.split('/').pop();
    html += '<li><a class="recent-item" onclick="handleFileClick(event, \'' + escapeJs(fp) + '\')" href="#">' + ICON_FILE + ' ' + escapeHtml(name) + '</a></li>';
  });
  html += '</ul>';
  existing.innerHTML = html;
}

function toggleBookmarksSection() {
  var body = document.querySelector('#bookmarks-section .section-body');
  var chevron = document.querySelector('#bookmarks-section .section-chevron');
  if (!body) return;
  var isCollapsed = body.classList.toggle('collapsed');
  if (chevron) chevron.classList.toggle('open', !isCollapsed);
  try { localStorage.setItem('md-viewer-bookmarks-collapsed', isCollapsed ? 'true' : 'false'); } catch (e) {}
}

/** Full-text search */
var fullTextTimer = null;
function performFullTextSearch(query) {
  if (!query || query.trim().length < 2) return;
  clearTimeout(fullTextTimer);
  fullTextTimer = setTimeout(async function () {
    try {
      var resp = await fetch('/api/search?q=' + encodeURIComponent(query));
      var data = await resp.json();
      var fileTreeEl = document.getElementById('file-tree');
      if (!fileTreeEl || !data.results || data.results.length === 0) return;
      var html = '<div class="search-results-header">Content matches</div>';
      data.results.forEach(function (r) {
        var snippet = escapeHtml(r.snippet).replace(new RegExp('(' + escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        html += '<a class="search-result-item" onclick="handleFileClick(event, \'' + escapeJs(r.path) + '\')" href="#">';
        html += '<div class="search-result-path">' + escapeHtml(r.path) + '</div>';
        html += '<div class="search-result-snippet">' + snippet + '</div>';
        html += '</a>';
      });
      // Append after filename results
      var existing = fileTreeEl.querySelector('.search-results-header');
      if (existing) {
        var parent = existing.parentNode;
        while (parent.lastChild !== existing.previousSibling) {
          if (parent.lastChild.classList && parent.lastChild.classList.contains('search-result-item')) parent.removeChild(parent.lastChild);
          else break;
        }
      }
      fileTreeEl.insertAdjacentHTML('beforeend', html);
    } catch (e) {}
  }, 300);
}

/** Fuzzy search — simple typo-tolerant matching */
function fuzzyMatch(query, text) {
  var q = query.toLowerCase();
  var t = text.toLowerCase();
  // Exact substring
  if (t.indexOf(q) !== -1) return true;
  // Character-by-character fuzzy
  var qi = 0;
  for (var ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Crossfade content transition */
function crossfadeContent(newHtml) {
  var pane = document.getElementById('content-pane');
  if (!pane) return;
  pane.classList.add('content-fade-out');
  setTimeout(function () {
    pane.innerHTML = newHtml;
    pane.classList.remove('content-fade-out');
    pane.classList.add('content-fade-in');
    setTimeout(function () { pane.classList.remove('content-fade-in'); }, 150);
  }, 100);
}

/** Keyboard-navigable file tree */
var kbFocusIndex = -1;
function setupKeyboardNav() {
  if (typeof document === 'undefined') return;
  document.addEventListener('keydown', function (e) {
    var searchInput = document.getElementById('search-input');
    if (document.activeElement === searchInput) {
      var links = document.querySelectorAll('#file-tree .file-link, #file-tree .search-result-item');
      if (links.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        kbFocusIndex = Math.min(kbFocusIndex + 1, links.length - 1);
        updateKbFocus(links);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        kbFocusIndex = Math.max(kbFocusIndex - 1, 0);
        updateKbFocus(links);
      } else if (e.key === 'Enter' && kbFocusIndex >= 0 && kbFocusIndex < links.length) {
        e.preventDefault();
        links[kbFocusIndex].click();
        searchInput.blur();
        kbFocusIndex = -1;
      }
    }
  });
}

function updateKbFocus(links) {
  links.forEach(function (l) { l.classList.remove('kb-focus'); });
  if (kbFocusIndex >= 0 && kbFocusIndex < links.length) {
    links[kbFocusIndex].classList.add('kb-focus');
    links[kbFocusIndex].scrollIntoView({ block: 'nearest' });
  }
}

/** Add anchor links to headings */
function addHeadingAnchors() {
  if (typeof document === 'undefined') return;
  var headings = document.querySelectorAll('#content-pane h1[id], #content-pane h2[id], #content-pane h3[id], #content-pane h4[id]');
  headings.forEach(function (h) {
    var a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = '#' + h.id;
    a.textContent = '#';
    a.onclick = function (e) {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth' });
      if (navigator.clipboard) navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#' + h.id);
      showToast('Link copied');
    };
    h.appendChild(a);
  });
}

/** Show toast notification */
function showToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('toast-visible');
  setTimeout(function () { toast.classList.remove('toast-visible'); }, 2000);
}

/** Scroll position memory per file */
var scrollPositions = {};
function saveScrollPosition() {
  if (!activeFile) return;
  var content = document.getElementById('content');
  if (content) scrollPositions[activeFile] = content.scrollTop;
}
function restoreScrollPosition(filePath) {
  if (scrollPositions[filePath]) {
    var content = document.getElementById('content');
    if (content) setTimeout(function () { content.scrollTop = scrollPositions[filePath]; }, 50);
    return true;
  }
  return false;
}

// === Command Palette ===
var cpIndex = -1;
var cpItems = [];

function openCommandPalette() {
  var cp = document.getElementById('command-palette');
  var input = document.getElementById('cp-input');
  if (!cp || !input) return;
  cp.classList.remove('cp-hidden');
  input.value = '';
  input.focus();
  updateCommandPalette('');
}

function closeCommandPalette() {
  var cp = document.getElementById('command-palette');
  if (cp) cp.classList.add('cp-hidden');
  cpIndex = -1;
}

function updateCommandPalette(query) {
  var results = document.getElementById('cp-results');
  if (!results) return;
  cpItems = [];
  var q = query.toLowerCase();

  // Actions
  var actions = [
    { type: 'action', label: 'Toggle Dark Mode', fn: function () { toggleTheme(); } },
    { type: 'action', label: 'Toggle Sidebar', fn: function () { toggleSidebar(); } },
    { type: 'action', label: 'Toggle Table of Contents', fn: function () { toggleToc(); } },
    { type: 'action', label: 'Zen Mode', fn: function () { toggleZenMode(); } },
    { type: 'action', label: 'Presentation Mode', fn: function () { enterPresentationMode(); } },
    { type: 'action', label: 'File Stats Dashboard', fn: function () { showStatsDashboard(); } },
    { type: 'action', label: 'Export to PDF', fn: function () { exportPdf(); } },
    { type: 'action', label: 'Edit in VS Code', fn: function () { openInVSCode(); } },
    { type: 'action', label: 'Edit in Neovim', fn: function () { openInNvim(); } },
    { type: 'action', label: 'Live Editor', fn: function () { openEditor(); } },
    { type: 'action', label: 'Share as HTML', fn: function () { shareAsHtml(); } },
    { type: 'action', label: 'High Contrast Mode', fn: function () { toggleHighContrast(); } },
    { type: 'action', label: 'Increase Font Size', fn: function () { changeFontSize(1); } },
    { type: 'action', label: 'Decrease Font Size', fn: function () { changeFontSize(-1); } },
  ];

  // Files
  var files = fileList.map(function (f) { return { type: 'file', label: f, fn: function () { loadFile(f); } }; });

  // Headings from current doc
  var headingItems = [];
  if (activeFile) {
    var headings = document.querySelectorAll('#content-pane h1[id], #content-pane h2[id], #content-pane h3[id]');
    headings.forEach(function (h) {
      headingItems.push({ type: 'heading', label: h.textContent.replace(/#$/, '').trim(), fn: function () { h.scrollIntoView({ behavior: 'smooth' }); } });
    });
  }

  var all = actions.concat(files).concat(headingItems);
  if (q) all = all.filter(function (item) { return fuzzyMatch(q, item.label); });
  cpItems = all.slice(0, 20);
  cpIndex = cpItems.length > 0 ? 0 : -1;

  var html = '';
  cpItems.forEach(function (item, i) {
    html += '<div class="cp-item' + (i === cpIndex ? ' cp-active' : '') + '" data-idx="' + i + '" onmouseenter="cpHover(' + i + ')" onclick="cpSelect(' + i + ')">';
    html += '<span class="cp-item-type">' + item.type + '</span>';
    html += '<span class="cp-item-label">' + escapeHtml(item.label) + '</span>';
    html += '</div>';
  });
  results.innerHTML = html || '<div class="cp-item" style="color:var(--text-tertiary)">No results</div>';
}

function cpHover(idx) { cpIndex = idx; highlightCpItem(); }
function cpSelect(idx) {
  if (cpItems[idx]) { closeCommandPalette(); cpItems[idx].fn(); }
}
function highlightCpItem() {
  var items = document.querySelectorAll('.cp-item[data-idx]');
  items.forEach(function (el, i) {
    if (i === cpIndex) el.classList.add('cp-active');
    else el.classList.remove('cp-active');
  });
  if (cpIndex >= 0 && items[cpIndex]) items[cpIndex].scrollIntoView({ block: 'nearest' });
}

// === Zen Mode ===
function toggleZenMode() {
  document.body.classList.toggle('zen-mode');
  var existing = document.querySelector('.zen-exit');
  if (document.body.classList.contains('zen-mode')) {
    if (!existing) {
      var btn = document.createElement('button');
      btn.className = 'zen-exit';
      btn.textContent = 'Exit Zen (Ctrl+Shift+Z)';
      btn.onclick = function () { toggleZenMode(); };
      document.body.appendChild(btn);
    }
  } else {
    if (existing) existing.remove();
  }
}

// === Presentation Mode ===
var presSlideIndex = 0;
var presSlides = [];

function enterPresentationMode() {
  if (!activeFile) { showToast('Open a file first'); return; }
  var pane = document.getElementById('content-pane');
  if (!pane) return;

  // Split content by <hr> tags into slides
  var html = pane.innerHTML;
  var parts = html.split(/<hr\s*\/?>/gi);
  if (parts.length < 2) { showToast('No --- separators found for slides'); return; }

  presSlides = parts;
  presSlideIndex = 0;
  document.body.classList.add('presentation-mode');

  renderSlide();

  // Add exit button
  var exit = document.createElement('button');
  exit.className = 'pres-exit';
  exit.textContent = 'Exit (Esc)';
  exit.onclick = exitPresentationMode;
  document.body.appendChild(exit);
}

function renderSlide() {
  var pane = document.getElementById('content-pane');
  if (!pane) return;
  pane.innerHTML = '<div class="slide">' + presSlides[presSlideIndex] + '</div>';
  // Remove old counter
  var old = document.querySelector('.slide-counter');
  if (old) old.remove();
  var counter = document.createElement('div');
  counter.className = 'slide-counter';
  counter.textContent = (presSlideIndex + 1) + ' / ' + presSlides.length;
  document.body.appendChild(counter);
}

function exitPresentationMode() {
  document.body.classList.remove('presentation-mode');
  var exit = document.querySelector('.pres-exit');
  if (exit) exit.remove();
  var counter = document.querySelector('.slide-counter');
  if (counter) counter.remove();
  presSlides = [];
  // Reload the file
  if (activeFile) loadFileDirectly(activeFile);
}

// === File Stats Dashboard ===
async function showStatsDashboard() {
  var pane = document.getElementById('content-pane');
  if (!pane) return;
  pane.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  var totalWords = 0;
  var totalFiles = fileList.length;
  var extensions = {};
  var dirCount = new Set();

  for (var fp of fileList) {
    var dir = fp.split('/').slice(0, -1).join('/') || '(root)';
    dirCount.add(dir);
    try {
      var resp = await fetch('/api/files/' + btoa(fp));
      if (resp.ok) {
        var data = await resp.json();
        var words = data.content.trim().split(/\s+/).length;
        totalWords += words;
      }
    } catch (e) {}
  }

  var avgWords = totalFiles > 0 ? Math.round(totalWords / totalFiles) : 0;
  var readingMins = Math.max(1, Math.round(totalWords / 200));

  pane.innerHTML =
    '<div class="stats-dashboard">' +
    '<h1>Documentation Stats</h1>' +
    '<div class="stats-grid">' +
    '<div class="stat-card"><div class="stat-value">' + totalFiles + '</div><div class="stat-label">Files</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + dirCount.size + '</div><div class="stat-label">Directories</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + totalWords.toLocaleString() + '</div><div class="stat-label">Total Words</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + avgWords.toLocaleString() + '</div><div class="stat-label">Avg Words/File</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + readingMins + ' min</div><div class="stat-label">Total Read Time</div></div>' +
    '</div></div>';

  // Clear breadcrumb
  var bc = document.getElementById('breadcrumb');
  if (bc) { bc.innerHTML = '<span class="breadcrumb-current">Stats Dashboard</span>'; bc.classList.add('visible'); }
}

// === Drag and Drop ===
function setupDragDrop() {
  if (typeof document === 'undefined') return;
  var overlay = document.getElementById('drop-overlay');

  document.addEventListener('dragover', function (e) {
    e.preventDefault();
    if (overlay) overlay.classList.remove('hidden');
  });
  document.addEventListener('dragleave', function (e) {
    if (e.relatedTarget === null && overlay) overlay.classList.add('hidden');
  });
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    if (overlay) overlay.classList.add('hidden');
    var files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.md')) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var pane = document.getElementById('content-pane');
        if (pane) {
          pane.innerHTML = renderMarkdown(ev.target.result);
          addCopyButtons();
          addLanguageLabels();
          renderMermaidBlocks();
          buildToc();
          addHeadingAnchors();
          setupLightbox();
          updateReadingInfo();
        }
        var bc = document.getElementById('breadcrumb');
        if (bc) { bc.innerHTML = '<span class="breadcrumb-current">' + escapeHtml(files[0].name) + ' (dropped)</span>'; bc.classList.add('visible'); }
        showToast('Loaded ' + files[0].name);
      };
      reader.readAsText(files[0]);
    }
  });
}

// === Embed Mode ===
function checkEmbedMode() {
  if (typeof window === 'undefined') return;
  if (window.location.search.indexOf('embed=true') !== -1) {
    document.body.classList.add('embed-mode');
  }
}

/** Add language labels to code blocks */
function addLanguageLabels() {
  if (typeof document === 'undefined') return;
  var pres = document.querySelectorAll('#content-pane pre');
  pres.forEach(function (pre) {
    var code = pre.querySelector('code[class*="language-"]');
    if (code) {
      var lang = code.className.match(/language-(\S+)/);
      if (lang && lang[1]) {
        var label = document.createElement('span');
        label.className = 'code-lang-label';
        label.textContent = lang[1];
        pre.appendChild(label);
      }
    }
  });
}

/** Render mermaid code blocks as diagrams */
function renderMermaidBlocks() {
  if (typeof document === 'undefined' || typeof mermaid === 'undefined') return;
  var codes = document.querySelectorAll('#content-pane code.language-mermaid');
  if (codes.length === 0) return;
  
  // Initialize mermaid with dark theme support
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
               document.documentElement.getAttribute('data-theme') === 'high-contrast';
  mermaid.initialize({ 
    startOnLoad: false, 
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose'
  });

  codes.forEach(function (code, i) {
    var pre = code.parentElement;
    var container = document.createElement('div');
    container.className = 'mermaid';
    container.textContent = code.textContent;
    pre.parentNode.replaceChild(container, pre);
  });
  try { mermaid.run({ nodes: document.querySelectorAll('.mermaid') }); } catch (e) { console.warn('Mermaid render error:', e); }
}

/** Build table of contents from headings */
function buildToc() {
  if (typeof document === 'undefined') return;
  var tocList = document.getElementById('toc-list');
  var tocToggle = document.getElementById('toc-toggle');
  if (!tocList) return;

  var headings = document.querySelectorAll('#content-pane h1, #content-pane h2, #content-pane h3');
  if (headings.length < 2) {
    tocList.innerHTML = '';
    if (tocToggle) tocToggle.style.display = 'none';
    return;
  }

  if (tocToggle) tocToggle.style.display = 'flex';
  var html = '';
  headings.forEach(function (h, i) {
    var id = 'heading-' + i;
    h.id = id;
    var level = h.tagName.toLowerCase();
    html += '<a class="toc-link toc-' + level + '" href="#' + id + '" onclick="scrollToHeading(event, \'' + id + '\')">' + h.textContent + '</a>';
  });
  tocList.innerHTML = html;

  // Highlight active TOC item on scroll
  setupTocScrollSpy();
}

/** Scroll to a heading smoothly */
function scrollToHeading(event, id) {
  event.preventDefault();
  var el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Highlight active TOC entry based on scroll position */
function setupTocScrollSpy() {
  var content = document.getElementById('content');
  if (!content) return;
  content.removeEventListener('scroll', tocScrollHandler);
  content.addEventListener('scroll', tocScrollHandler);
}

function tocScrollHandler() {
  var headings = document.querySelectorAll('#content-pane h1[id], #content-pane h2[id], #content-pane h3[id]');
  var links = document.querySelectorAll('.toc-link');
  var scrollTop = document.getElementById('content').scrollTop;
  var activeIdx = 0;
  headings.forEach(function (h, i) {
    if (h.offsetTop - 80 <= scrollTop) activeIdx = i;
  });
  links.forEach(function (l, i) {
    if (i === activeIdx) l.classList.add('toc-active');
    else l.classList.remove('toc-active');
  });
}

/** Toggle TOC panel */
function toggleToc() {
  var panel = document.getElementById('toc-panel');
  if (panel) panel.classList.toggle('toc-hidden');
}

/** Recent files management */
function getRecentFiles() {
  try {
    var saved = localStorage.getItem('md-viewer-recent');
    return saved ? JSON.parse(saved) : [];
  } catch (e) { return []; }
}

function addToRecent(filePath) {
  try {
    var recent = getRecentFiles().filter(function (f) { return f !== filePath; });
    recent.unshift(filePath);
    if (recent.length > 5) recent = recent.slice(0, 5);
    localStorage.setItem('md-viewer-recent', JSON.stringify(recent));
    renderRecentFiles();
  } catch (e) {}
}

function renderRecentFiles() {
  if (typeof document === 'undefined') return;
  var existing = document.getElementById('recent-section');
  var recent = getRecentFiles();
  if (recent.length === 0) {
    if (existing) existing.remove();
    return;
  }
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'recent-section';
    existing.className = 'recent-section';
    var fileTree = document.getElementById('file-tree');
    if (fileTree) fileTree.parentNode.insertBefore(existing, fileTree);
  }
  var isCollapsed = false;
  try { isCollapsed = localStorage.getItem('md-viewer-recent-collapsed') === 'true'; } catch (e) {}

  var html = '<div class="section-header" onclick="toggleRecentSection()">';
  html += '<svg class="section-chevron' + (isCollapsed ? '' : ' open') + '" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L7 5L3.5 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  html += '<span class="recent-label">Recent</span>';
  html += '</div>';
  html += '<ul class="recent-list section-body' + (isCollapsed ? ' collapsed' : '') + '">';
  recent.forEach(function (fp) {
    var name = fp.split('/').pop();
    html += '<li><a class="recent-item" onclick="handleFileClick(event, \'' + escapeJs(fp) + '\')" href="#">' + ICON_FILE + ' ' + escapeHtml(name) + '</a></li>';
  });
  html += '</ul>';
  existing.innerHTML = html;
}

function toggleRecentSection() {
  var body = document.querySelector('#recent-section .section-body');
  var chevron = document.querySelector('#recent-section .section-chevron');
  if (!body) return;
  var isCollapsed = body.classList.toggle('collapsed');
  if (chevron) chevron.classList.toggle('open', !isCollapsed);
  try { localStorage.setItem('md-viewer-recent-collapsed', isCollapsed ? 'true' : 'false'); } catch (e) {}
}

/** Setup resizable sidebar via drag handle */
function setupResizeHandle() {
  if (typeof document === 'undefined') return;
  var sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  var handle = document.createElement('div');
  handle.className = 'resize-handle';
  sidebar.appendChild(handle);

  var startX, startWidth;
  handle.addEventListener('mousedown', function (e) {
    e.preventDefault();
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    handle.classList.add('active');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', onDragEnd);
  });

  function onDrag(e) {
    var newWidth = startWidth + (e.clientX - startX);
    if (newWidth < 180) newWidth = 180;
    if (newWidth > 500) newWidth = 500;
    sidebar.style.width = newWidth + 'px';
    sidebar.style.minWidth = newWidth + 'px';
  }

  function onDragEnd() {
    handle.classList.remove('active');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
  }
}

/** Handle URL hash routing */
function handleHashRoute() {
  if (typeof window === 'undefined') return;
  var hash = window.location.hash;
  if (hash && hash.startsWith('#/')) {
    var filePath = hash.substring(2);
    if (fileList.indexOf(filePath) !== -1) {
      loadFile(filePath);
    }
  }
}

/** Start polling for file changes */
var pollTimer = null;
function startFileWatcher() {
  if (typeof window === 'undefined') return;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async function () {
    try {
      var response = await fetch('/api/files');
      var data = await response.json();
      var newFiles = data.files || [];
      if (JSON.stringify(newFiles) !== JSON.stringify(fileList)) {
        fileList = newFiles;
        var tree = buildFileTree(fileList);
        var fileTreeEl = document.getElementById('file-tree');
        if (fileTreeEl) {
          fileTreeEl.innerHTML = renderSidebar(tree);
          restoreExpandedFolders();
          if (activeFile) highlightActiveFile(activeFile);
        }
        showToast('File list updated');
        // If active file was deleted, show a message
        if (activeFile && newFiles.indexOf(activeFile) === -1) {
          var pane = document.getElementById('content-pane');
          if (pane) {
            pane.innerHTML = '<p class="error-message">This file has been deleted: ' + escapeHtml(activeFile) + '</p>';
            pane.dataset.lastContent = '';
          }
          activeFile = null;
          return;
        }
      }
      // If viewing a file, refresh its content
      if (activeFile) {
        var enc = btoa(activeFile);
        var resp = await fetch('/api/files/' + enc);
        if (resp.ok) {
          var d = await resp.json();
          var pane = document.getElementById('content-pane');
          if (pane && pane.dataset.lastContent !== d.content) {
            pane.dataset.lastContent = d.content;
            pane.innerHTML = renderMarkdown(d.content);
            addCopyButtons();
            addLanguageLabels();
            renderMermaidBlocks();
            buildToc();
            updateReadingInfo();
            setupLightbox();
            addHeadingAnchors();
            showToast('Content refreshed');
          }
        }
      }
    } catch (e) {}
  }, 3000);
}

// Keyboard shortcuts
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', function (e) {
    // Ctrl+P — command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      openCommandPalette();
    }
    // Ctrl+K — focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var input = document.getElementById('search-input');
      if (input) { input.focus(); input.select(); }
    }
    // Ctrl+B — toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    // Ctrl+T — toggle TOC
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      toggleToc();
    }
    // Alt+Left — navigate back
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateBack();
    }
    // Alt+Right — navigate forward
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      navigateForward();
    }
    // Ctrl+Shift+Z — zen mode
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
      e.preventDefault();
      toggleZenMode();
    }
    // Escape — clear search or close palette/presentation
    if (e.key === 'Escape') {
      var cp = document.getElementById('command-palette');
      if (cp && !cp.classList.contains('cp-hidden')) {
        closeCommandPalette(); return;
      }
      if (document.body.classList.contains('presentation-mode')) {
        exitPresentationMode(); return;
      }
      var input = document.getElementById('search-input');
      if (input && document.activeElement === input) {
        input.value = '';
        filterFiles('');
        input.blur();
      }
    }
    // Presentation mode: arrow keys for slides
    if (document.body.classList.contains('presentation-mode')) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (presSlideIndex < presSlides.length - 1) { presSlideIndex++; renderSlide(); }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (presSlideIndex > 0) { presSlideIndex--; renderSlide(); }
      }
    }
    // Command palette navigation
    if (!document.getElementById('command-palette').classList.contains('cp-hidden')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); cpIndex = Math.min(cpIndex + 1, cpItems.length - 1); highlightCpItem(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cpIndex = Math.max(cpIndex - 1, 0); highlightCpItem(); }
      else if (e.key === 'Enter' && cpIndex >= 0) { e.preventDefault(); cpSelect(cpIndex); }
    }
  });
}

// Initialize
if (typeof document !== 'undefined') {
  // Init mermaid
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applySavedTheme();
    loadFileList().then(function () {
      renderRecentFiles();
      renderBookmarks();
      loadTags();
      handleHashRoute();
    });

    // Wire up search
    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      var debounceTimer;
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { filterFiles(searchInput.value); }, 150);
      });
    }

    // Setup resize handle
    setupResizeHandle();

    // Setup keyboard navigation
    setupKeyboardNav();

    // Setup drag and drop
    setupDragDrop();

    // Check embed mode
    checkEmbedMode();

    // Wire up command palette input
    var cpInput = document.getElementById('cp-input');
    if (cpInput) {
      cpInput.addEventListener('input', function () { updateCommandPalette(cpInput.value); });
    }

    // Start file watcher
    startFileWatcher();
  });

  // Handle hash changes (browser back/forward)
  window.addEventListener('hashchange', function () {
    var hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      var filePath = hash.substring(2);
      if (filePath !== activeFile && fileList.indexOf(filePath) !== -1) {
        loadFileDirectly(filePath);
      }
    }
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildFileTree, renderSidebar, renderMarkdown, loadFileList, loadFile, handleFileClick, highlightActiveFile, handleInternalLinks, toggleTheme, applySavedTheme, toggleSidebar };
}
