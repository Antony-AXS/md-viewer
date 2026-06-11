const fc = require('fast-check');
const { buildFileTree, renderMarkdown } = require('../public/app');

// Arbitrary: safe name segment (lowercase alphanumeric, 1-8 chars)
const safeNameArb = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
    { minLength: 1, maxLength: 8 }
  );

// Arbitrary: generate a relative .md file path with 0-3 directory levels
const mdFilePathArb = fc
  .tuple(
    fc.array(safeNameArb, { minLength: 0, maxLength: 3 }), // directory segments
    safeNameArb // file name without extension
  )
  .map(([dirs, name]) => [...dirs, `${name}.md`].join('/'));

// Arbitrary: generate a unique array of .md file paths (no duplicates)
const uniqueMdFilePathsArb = fc
  .array(mdFilePathArb, { minLength: 0, maxLength: 20 })
  .map((paths) => [...new Set(paths)]);

/**
 * Recursively extract all leaf node paths from a file tree.
 * Leaf nodes are those with path !== null (files, not directories).
 * @param {Object[]} nodes - Tree nodes from buildFileTree
 * @returns {string[]} - Array of file paths
 */
function extractLeafPaths(nodes) {
  const paths = [];
  for (const node of nodes) {
    if (node.path !== null) {
      paths.push(node.path);
    }
    if (node.children && node.children.length > 0) {
      paths.push(...extractLeafPaths(node.children));
    }
  }
  return paths;
}

describe('File Tree Property Tests', () => {
  /**
   * Property 4: File tree round-trip
   * For any flat list of file paths, converting to a tree structure via
   * buildFileTree and then extracting all leaf node paths from that tree
   * should produce the same set of file paths as the original list.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 4: File tree round-trip', () => {
    fc.assert(
      fc.property(uniqueMdFilePathsArb, (filePaths) => {
        const tree = buildFileTree(filePaths);
        const extractedPaths = extractLeafPaths(tree);

        // Same number of paths
        expect(extractedPaths.length).toBe(filePaths.length);

        // Same set of paths (order may differ)
        expect(new Set(extractedPaths)).toEqual(new Set(filePaths));
      }),
      { numRuns: 100 }
    );
  });
});

// --- Arbitraries for Property 5: Internal markdown links are rewritten ---

// Arbitrary: safe name segment for paths (lowercase alphanumeric, 1-6 chars)
const pathSegmentArb = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
    { minLength: 1, maxLength: 6 }
  );

// Arbitrary: a relative .md link path with 0-2 directory levels
const relativeMdLinkArb = fc
  .tuple(
    fc.array(pathSegmentArb, { minLength: 0, maxLength: 2 }),
    pathSegmentArb
  )
  .map(([dirs, name]) => [...dirs, `${name}.md`].join('/'));

// Arbitrary: link text (simple alphanumeric)
const linkTextArb = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')),
    { minLength: 1, maxLength: 12 }
  );

// Arbitrary: a markdown string containing one or more relative .md links
const markdownWithMdLinksArb = fc
  .array(
    fc.tuple(relativeMdLinkArb, linkTextArb),
    { minLength: 1, maxLength: 5 }
  )
  .map((links) =>
    links.map(([href, text]) => `[${text}](${href})`).join('\n\n')
  );

// Arbitrary: external link protocols that should NOT be rewritten
const externalLinkArb = fc.constantFrom(
  'https://example.com/readme.md',
  'http://example.com/docs/guide.md',
  'mailto:user@example.com',
  '#section-heading',
  'javascript:void(0)'
);

// Arbitrary: markdown with a mix of internal .md links and external links
const mixedMarkdownArb = fc
  .tuple(
    fc.array(
      fc.tuple(relativeMdLinkArb, linkTextArb),
      { minLength: 1, maxLength: 3 }
    ),
    fc.array(
      fc.tuple(externalLinkArb, linkTextArb),
      { minLength: 0, maxLength: 3 }
    )
  )
  .map(([internal, external]) => {
    const internalMd = internal.map(([href, text]) => `[${text}](${href})`);
    const externalMd = external.map(([href, text]) => `[${text}](${href})`);
    return [...internalMd, ...externalMd].join('\n\n');
  });

describe('Link Rewriting Property Tests', () => {
  /**
   * Property 5: Internal markdown links are rewritten
   * For any markdown content containing relative links to .md files,
   * the rendered HTML should transform those links into internal viewer
   * navigation calls (javascript:void(0) with loadFile handlers) rather
   * than leaving them as raw relative file paths.
   *
   * **Validates: Requirements 3.4**
   */
  it('Property 5: relative .md links are rewritten to loadFile handlers', () => {
    fc.assert(
      fc.property(markdownWithMdLinksArb, (markdown) => {
        const html = renderMarkdown(markdown);

        // No raw relative .md hrefs should remain in the output
        // A raw relative .md href would look like href="something.md" or href="dir/something.md"
        // but NOT href="https://..." or href="javascript:void(0)"
        const rawMdLinkPattern = /href="(?!https?:\/\/|mailto:|#|javascript:)[^"]*\.md"/g;
        const rawMatches = html.match(rawMdLinkPattern);
        expect(rawMatches).toBeNull();

        // All rewritten links should have javascript:void(0) href and loadFile onclick
        const rewrittenPattern = /href="javascript:void\(0\)"\s+onclick="loadFile\('/g;
        const rewrittenMatches = html.match(rewrittenPattern);
        expect(rewrittenMatches).not.toBeNull();
        expect(rewrittenMatches.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 5: external links are NOT rewritten', () => {
    fc.assert(
      fc.property(mixedMarkdownArb, (markdown) => {
        const html = renderMarkdown(markdown);

        // External https/http links should still have their original href
        const httpLinks = html.match(/href="https?:\/\/[^"]*"/g) || [];
        const mailtoLinks = html.match(/href="mailto:[^"]*"/g) || [];
        const hashLinks = html.match(/href="#[^"]*"/g) || [];

        // Count how many external links were in the input
        const httpCount = (markdown.match(/\]\(https?:\/\//g) || []).length;
        const mailtoCount = (markdown.match(/\]\(mailto:/g) || []).length;
        const hashCount = (markdown.match(/\]\(#/g) || []).length;

        // External links should be preserved (not rewritten)
        expect(httpLinks.length).toBe(httpCount);
        expect(mailtoLinks.length).toBe(mailtoCount);
        expect(hashLinks.length).toBe(hashCount);

        // No raw relative .md hrefs should remain
        const rawMdLinkPattern = /href="(?!https?:\/\/|mailto:|#|javascript:)[^"]*\.md"/g;
        const rawMatches = html.match(rawMdLinkPattern);
        expect(rawMatches).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
