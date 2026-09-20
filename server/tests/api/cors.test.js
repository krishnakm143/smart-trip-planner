import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

describe('CORS', () => {
  it('allows every configured origin and no other', async () => {
    vi.resetModules();
    vi.stubEnv('CLIENT_ORIGIN', 'http://localhost:5173, https://krishnakm143.github.io/');
    const { createApp } = await import('../../src/app.js');
    const app = createApp();

    const allowed = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://krishnakm143.github.io');
    const local = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    const other = await request(app).get('/api/v1/health').set('Origin', 'https://example.org');

    expect(allowed.headers['access-control-allow-origin']).toBe('https://krishnakm143.github.io');
    expect(local.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();

    vi.unstubAllEnvs();
  });
});
