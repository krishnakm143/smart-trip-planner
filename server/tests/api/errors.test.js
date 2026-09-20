import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { startTestDb, stopTestDb } from '../helpers/db.js';

const api = request(createApp());

beforeAll(startTestDb);
afterAll(stopTestDb);

describe('error envelope', () => {
  it('returns NOT_FOUND for an unknown route', async () => {
    const response = await api.get('/api/v1/nowhere');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route GET /api/v1/nowhere not found' },
    });
  });

  it('returns VALIDATION_ERROR for a body that is not valid JSON', async () => {
    const response = await api
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' },
    });
  });

  it('returns VALIDATION_ERROR with details when the body is missing', async () => {
    const response = await api.post('/api/v1/auth/login');

    expect(response.status).toBe(400);
    expect(response.body.error.details.map((detail) => detail.path).sort()).toEqual([
      'email',
      'password',
    ]);
  });

  it('never exposes a stack trace', async () => {
    const response = await api.get('/api/v1/trips/not-an-id');
    expect(JSON.stringify(response.body)).not.toMatch(/stack|node_modules|at \w+ \(/);
  });

  it('sets security headers and hides the framework', async () => {
    const response = await api.get('/api/v1/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
