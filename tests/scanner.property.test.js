const fc = require('fast-check');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { scanMarkdownFiles } = require('../scanner');

// Helper: create a temporary directory tree from a descriptor
// descriptor is an array of relative file paths to create
async function createTempTree(filePaths) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scanner-test-'));
  for (const filePath of filePaths) {
    const fullPath = path.join(tmpDir, filePath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, `# ${path.basename(filePath)}`);
  }
  return tmpDir;
}

// Helper: recursively remove a directory
async function removeTempTree(dir) {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

// Arbitrary: generate a safe directory/file name segment (no special chars, no dots at start)
const safeNameArb = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
    { minLength: 1, maxLength: 8 }
  )
  .map((s) => (s.length === 0 ? 'a' : s));

// Arbitrary: generate a relative file path with 0-2 directory levels
const relativePathArb = fc
  .tuple(
    fc.array(safeNameArb, { minLength: 0, maxLength: 2 }), // directory segments
    safeNameArb // file name (without extension)
  )
  .map(([dirs, name]) => [...dirs, name].join('/'));

// Arbitrary: generate a file entry — either .md or non-.md
const fileEntryArb = fc
  .tuple(relativePathArb, fc.boolean())
  .map(([p, isMd]) => ({
    path: isMd ? `${p}.md` : `${p}.txt`,
    isMd,
  }));

// Arbitrary: generate a complete directory tree descriptor
// Includes regular files, plus optionally files inside node_modules and md-viewer
const directoryTreeArb = fc
  .tuple(
    fc.array(fileEntryArb, { minLength: 0, maxLength: 10 }), // regular files
    fc.array(fileEntryArb, { minLength: 0, maxLength: 3 }),  // files in node_modules
    fc.array(fileEntryArb, { minLength: 0, maxLength: 3 })   // files in md-viewer
  )
  .map(([regular, nodeModFiles, mdViewerFiles]) => {
    const allFiles = [
      ...regular.map((f) => ({ ...f, excluded: false })),
      ...nodeModFiles.map((f) => ({
        ...f,
        path: `node_modules/${f.path}`,
        excluded: true,
      })),
      ...mdViewerFiles.map((f) => ({
        ...f,
        path: `md-viewer/${f.path}`,
        excluded: true,
      })),
    ];
    // Deduplicate by path
    const seen = new Set();
    return allFiles.filter((f) => {
      if (seen.has(f.path)) return false;
      seen.add(f.path);
      return true;
    });
  });


describe('Scanner Property Tests', () => {
  /**
   * Property 1: Scanner discovers exactly the correct files
   * For any directory tree containing .md files, the Scanner should return
   * exactly the set of .md files that exist in the tree, excluding any files
   * inside directories named node_modules or md-viewer.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('Property 1: Scanner discovers exactly the correct files', async () => {
    await fc.assert(
      fc.asyncProperty(directoryTreeArb, async (tree) => {
        const tmpDir = await createTempTree(tree.map((f) => f.path));
        try {
          const result = await scanMarkdownFiles(tmpDir);

          // Expected: only .md files that are NOT in excluded directories
          const expected = tree
            .filter((f) => f.isMd && !f.excluded)
            .map((f) => f.path)
            .sort((a, b) => a.localeCompare(b));

          expect(result).toEqual(expected);
        } finally {
          await removeTempTree(tmpDir);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: All discovered paths are relative
   * For any file path returned by the Scanner, the path should be relative
   * to the repository root (not start with / or contain the absolute root
   * directory prefix).
   *
   * **Validates: Requirements 1.3**
   */
  it('Property 2: All discovered paths are relative', async () => {
    await fc.assert(
      fc.asyncProperty(directoryTreeArb, async (tree) => {
        const tmpDir = await createTempTree(tree.map((f) => f.path));
        try {
          const result = await scanMarkdownFiles(tmpDir);

          for (const filePath of result) {
            // Must not be absolute
            expect(path.isAbsolute(filePath)).toBe(false);
            // Must not start with /
            expect(filePath.startsWith('/')).toBe(false);
            // Must not contain the tmpDir prefix
            expect(filePath.includes(tmpDir)).toBe(false);
            // Must resolve to an existing file when joined with rootDir
            const fullPath = path.join(tmpDir, filePath);
            const exists = await fs.promises
              .access(fullPath)
              .then(() => true)
              .catch(() => false);
            expect(exists).toBe(true);
          }
        } finally {
          await removeTempTree(tmpDir);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: File list is sorted alphabetically
   * For any set of discovered markdown files, the returned list should be
   * sorted in ascending alphabetical order by file path.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3: File list is sorted alphabetically', async () => {
    await fc.assert(
      fc.asyncProperty(directoryTreeArb, async (tree) => {
        const tmpDir = await createTempTree(tree.map((f) => f.path));
        try {
          const result = await scanMarkdownFiles(tmpDir);

          // Verify the list is sorted
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].localeCompare(result[i])).toBeLessThanOrEqual(0);
          }
        } finally {
          await removeTempTree(tmpDir);
        }
      }),
      { numRuns: 100 }
    );
  });
});
