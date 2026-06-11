// Scanner module - discovers .md files in the repository
const fs = require('fs');
const path = require('path');

/**
 * Recursively scans a directory for .md files.
 * @param {string} rootDir - The repository root directory (parent of md-viewer)
 * @param {string[]} excludeDirs - Directory names to skip (e.g., ['node_modules', 'md-viewer'])
 * @returns {Promise<string[]>} - Array of relative file paths sorted alphabetically
 */
async function scanMarkdownFiles(rootDir, excludeDirs = ['node_modules', 'md-viewer']) {
  const results = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.warn(`Warning: could not read directory ${dir}: ${err.message}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(rootDir, fullPath);
        results.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  results.sort((a, b) => a.localeCompare(b));
  return results;
}

module.exports = { scanMarkdownFiles };
