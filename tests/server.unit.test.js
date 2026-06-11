const request = require('supertest');
const { app, _setCachedFiles } = require('../server');

beforeAll(() => {
  // Set a known cached file list for predictable test behavior
  _setCachedFiles(['README.md', 'docs/guide.md']);
});

afterAll(() => {
  _setCachedFiles([]);
});

describe('Server error handling', () => {
  describe('404 - File not found', () => {
    it('returns 404 for a file not in the scanned list', async () => {
      const encodedPath = Buffer.from('nonexistent.md').toString('base64');
      const res = await request(app).get(`/api/files/${encodedPath}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'File not found' });
    });
  });

  describe('403 - Path traversal', () => {
    it('returns 403 for path traversal with ../', async () => {
      const encodedPath = Buffer.from('../../etc/passwd.md').toString('base64');
      const res = await request(app).get(`/api/files/${encodedPath}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Access denied' });
    });

    it('returns 403 for absolute path outside repo', async () => {
      const encodedPath = Buffer.from('/etc/passwd.md').toString('base64');
      const res = await request(app).get(`/api/files/${encodedPath}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Access denied' });
    });
  });

  describe('400 - Non-.md files', () => {
    it('returns 400 for a .txt file', async () => {
      const encodedPath = Buffer.from('notes.txt').toString('base64');
      const res = await request(app).get(`/api/files/${encodedPath}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Only .md files are supported' });
    });

    it('returns 400 for a file with no extension', async () => {
      const encodedPath = Buffer.from('Makefile').toString('base64');
      const res = await request(app).get(`/api/files/${encodedPath}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Only .md files are supported' });
    });
  });
});
