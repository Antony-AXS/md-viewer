const { buildFileTree, renderSidebar, renderMarkdown } = require('../public/app');

describe('buildFileTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildFileTree([])).toEqual([]);
  });

  it('handles root-level files (no directory)', () => {
    const tree = buildFileTree(['README.md', 'CHANGELOG.md']);
    expect(tree).toEqual([
      { name: 'README.md', path: 'README.md', children: [] },
      { name: 'CHANGELOG.md', path: 'CHANGELOG.md', children: [] },
    ]);
  });

  it('groups files under directory nodes', () => {
    const tree = buildFileTree(['docs/guide.md', 'docs/api.md']);
    expect(tree).toEqual([
      {
        name: 'docs',
        path: null,
        children: [
          { name: 'guide.md', path: 'docs/guide.md', children: [] },
          { name: 'api.md', path: 'docs/api.md', children: [] },
        ],
      },
    ]);
  });

  it('handles deeply nested directory structures', () => {
    const tree = buildFileTree(['a/b/c/deep.md']);
    expect(tree).toEqual([
      {
        name: 'a',
        path: null,
        children: [
          {
            name: 'b',
            path: null,
            children: [
              {
                name: 'c',
                path: null,
                children: [
                  { name: 'deep.md', path: 'a/b/c/deep.md', children: [] },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('mixes root-level files and directories', () => {
    const tree = buildFileTree(['README.md', 'docs/guide.md']);
    expect(tree).toHaveLength(2);

    const readme = tree.find((n) => n.name === 'README.md');
    expect(readme).toEqual({ name: 'README.md', path: 'README.md', children: [] });

    const docs = tree.find((n) => n.name === 'docs');
    expect(docs.path).toBeNull();
    expect(docs.children).toHaveLength(1);
    expect(docs.children[0].path).toBe('docs/guide.md');
  });

  it('reuses existing directory nodes for shared prefixes', () => {
    const tree = buildFileTree(['docs/a.md', 'docs/b.md', 'docs/sub/c.md']);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('docs');
    expect(tree[0].children).toHaveLength(3); // a.md, b.md, sub/
  });
});

describe('renderSidebar', () => {
  it('returns empty message for empty tree', () => {
    const html = renderSidebar([]);
    expect(html).toContain('No markdown files found');
  });

  it('returns empty message for null input', () => {
    const html = renderSidebar(null);
    expect(html).toContain('No markdown files found');
  });

  it('renders file links with data-path attributes', () => {
    const tree = [{ name: 'README.md', path: 'README.md', children: [] }];
    const html = renderSidebar(tree);
    expect(html).toContain('data-path="README.md"');
    expect(html).toContain('README.md');
    expect(html).toContain('file-link');
  });

  it('renders directory toggles with dir-toggle class', () => {
    const tree = [
      {
        name: 'docs',
        path: null,
        children: [{ name: 'guide.md', path: 'docs/guide.md', children: [] }],
      },
    ];
    const html = renderSidebar(tree);
    expect(html).toContain('dir-toggle');
    expect(html).toContain('docs');
    expect(html).toContain('guide.md');
  });

  it('renders directories before files', () => {
    const tree = buildFileTree(['README.md', 'docs/guide.md']);
    const html = renderSidebar(tree);
    const docsPos = html.indexOf('docs');
    const readmePos = html.indexOf('README.md');
    expect(docsPos).toBeLessThan(readmePos);
  });

  it('escapes HTML in file names', () => {
    const tree = [{ name: '<script>alert(1)</script>.md', path: '<script>alert(1)</script>.md', children: [] }];
    const html = renderSidebar(tree);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('renderMarkdown', () => {
  it('renders headings (h1-h3)', () => {
    const html = renderMarkdown('# H1\n## H2\n### H3');
    expect(html).toContain('<h1>H1</h1>');
    expect(html).toContain('<h2>H2</h2>');
    expect(html).toContain('<h3>H3</h3>');
  });

  it('renders bold text', () => {
    const html = renderMarkdown('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders italic text', () => {
    const html = renderMarkdown('*italic*');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders external links unchanged', () => {
    const html = renderMarkdown('[Google](https://google.com)');
    expect(html).toContain('<a href="https://google.com">Google</a>');
  });

  it('rewrites internal .md links to viewer navigation', () => {
    const html = renderMarkdown('[Guide](docs/guide.md)');
    expect(html).toContain('onclick="loadFile(');
    expect(html).toContain('docs/guide.md');
    expect(html).not.toContain('href="docs/guide.md"');
  });

  it('renders images', () => {
    const html = renderMarkdown('![alt text](image.png)');
    expect(html).toContain('<img src="image.png" alt="alt text">');
  });

  it('renders code blocks with syntax highlighting', () => {
    const html = renderMarkdown('```javascript\nconst x = 1;\n```');
    expect(html).toContain('<pre><code class="language-javascript">');
    expect(html).toContain('hljs-');
  });

  it('renders tables', () => {
    const html = renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders blockquotes', () => {
    const html = renderMarkdown('> quote text');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('quote text');
  });

  it('renders unordered and ordered lists', () => {
    const ul = renderMarkdown('- item1\n- item2');
    expect(ul).toContain('<ul>');
    expect(ul).toContain('<li>item1</li>');

    const ol = renderMarkdown('1. first\n2. second');
    expect(ol).toContain('<ol>');
    expect(ol).toContain('<li>first</li>');
  });
});
