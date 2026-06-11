const fc = require('fast-check');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app, _setCachedFiles } = require('../server');
const { scanMarkdownFiles } = require('../scanner');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Discover real .md files once before all tests
let allMdFiles = [];

beforeAll(async () => {
  allMdFiles = await scanMarkdownFiles(ROOT_DIR);
  // Inject the scanned list into the server's cache
  _setCachedFiles(allMdFiles);
});

afterAll(() => {
  _setCachedFiles([]);
});

describe('Server Property Tests', () => {
  /**
   * Property 6: API file content matches disk
   * For any file in the scanned file list, requesting that file via the API
   * endpoint should return content identical to reading the file directly
   * from disk with fs.readFile.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 6: API file content matches disk', async () => {
    // Guard: skip if no .md files found in the repo
    expect(allMdFiles.length).toBeGreaterThan(0);

    // Arbitrary: pick a random file from the scanned list
    const fileArb = fc.constantFrom(...allMdFiles);

    await fc.assert(
      fc.asyncProperty(fileArb, async (filePath) => {
        const encodedPath = Buffer.from(filePath).toString('base64');

        // Request via API
        const res = await request(app).get(`/api/files/${encodedPath}`);

        expect(res.status).toBe(200);
        expect(res.body.path).toBe(filePath);

        // Read directly from disk
        const fullPath = path.resolve(ROOT_DIR, filePath);
        const diskContent = await fs.promises.readFile(fullPath, 'utf-8');

        expect(res.body.content).toBe(diskContent);
      }),
      { numRuns: 100 }
    );
  });
});
