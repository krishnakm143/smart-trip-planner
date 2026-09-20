import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db.js';

const api = request(createApp());
const credentials = { name: 'Asha Patel', email: 'asha@example.com', password: 'Password@123' };

beforeAll(startTestDb);
beforeEach(clearTestDb);
afterAll(stopTestDb);

describe('POST /auth/register', () => {
  it('creates an account and returns the public user with a token', async () => {
    const response = await api.post('/api/v1/auth/register').send(credentials);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(Object.keys(response.body.data.user).sort()).toEqual(
      ['createdAt', 'email', 'id', 'name', 'role'].sort(),
    );
    expect(response.body.data.user).toMatchObject({
      name: 'Asha Patel',
      email: 'asha@example.com',
      role: 'traveler',
    });
  });

  it('normalises the email to lower case', async () => {
    const response = await api
      .post('/api/v1/auth/register')
      .send({ ...credentials, email: '  Asha@Example.COM ' });
    expect(response.body.data.user.email).toBe('asha@example.com');
  });

  it('rejects a duplicate email with 409', async () => {
    await api.post('/api/v1/auth/register').send(credentials);
    const response = await api.post('/api/v1/auth/register').send(credentials);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('returns field-level details for invalid input', async () => {
    const response = await api
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: expect.arrayContaining([
          { path: 'name', message: expect.any(String) },
          { path: 'email', message: expect.any(String) },
          { path: 'password', message: expect.any(String) },
        ]),
      },
    });
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => api.post('/api/v1/auth/register').send(credentials));

  it('logs in with correct credentials', async () => {
    const response = await api
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(credentials.email);
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it.each([
    ['wrong password', { email: credentials.email, password: 'Wrong@12345' }],
    ['unknown email', { email: 'nobody@example.com', password: credentials.password }],
  ])('rejects %s with 401', async (_label, body) => {
    const response = await api.post('/api/v1/auth/login').send(body);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const registered = await api.post('/api/v1/auth/register').send(credentials);
    const response = await api
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toEqual(registered.body.data.user);
  });

  it.each([
    ['no header', undefined],
    ['a malformed token', 'Bearer not.a.jwt'],
    ['a non-bearer scheme', 'Basic abc123'],
  ])('rejects %s with 401', async (_label, header) => {
    const pending = api.get('/api/v1/auth/me');
    if (header) pending.set('Authorization', header);
    const response = await pending;

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
