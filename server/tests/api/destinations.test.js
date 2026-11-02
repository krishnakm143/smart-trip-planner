import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { startTestDb, stopTestDb } from '../helpers/db.js';
import { manaliActivities, seedDestination } from '../helpers/fixtures.js';

const api = request(createApp());

beforeAll(async () => {
  await startTestDb();
  await seedDestination('manali');
  await seedDestination('goa');
});
afterAll(stopTestDb);

describe('GET /health', () => {
  it('reports service, database and provider status at /api/v1/health', async () => {
    const response = await api.get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok', db: 'connected', provider: 'local' },
    });
  });

  it('answers Railway health checks at root /health', async () => {
    const response = await api.get('/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('answers service root GET / with status ok', async () => {
    const response = await api.get('/');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('GET /destinations/places/photo', () => {
  it('rejects missing or malformed photo resource names with 400', async () => {
    const resNoName = await api.get('/api/v1/destinations/places/photo');
    expect(resNoName.status).toBe(400);

    const resBadName = await api.get('/api/v1/destinations/places/photo').query({ name: 'invalid-name' });
    expect(resBadName.status).toBe(400);
  });

  it('returns 404 when Google Maps API key is not configured in test environment', async () => {
    const res = await api.get('/api/v1/destinations/places/photo').query({ name: 'places/ChIJ123/photos/456' });
    expect(res.status).toBe(404);
  });
});

describe('GET /destinations', () => {
  it('lists destinations with pagination fields', async () => {
    const response = await api.get('/api/v1/destinations');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ total: 2, page: 1, limit: 12 });
    expect(response.body.data.items.map((item) => item.slug)).toEqual(['manali', 'goa']);
  });

  it('serialises documents with id and without _id or __v', async () => {
    const response = await api.get('/api/v1/destinations');
    const [destination] = response.body.data.items;

    expect(destination.id).toEqual(expect.any(String));
    expect(destination._id).toBeUndefined();
    expect(destination.__v).toBeUndefined();
    expect(destination.location).toEqual({ lat: 32.2432, lng: 77.1892 });
    expect(destination.dailyCost.standard).toEqual({ stay: 3000, food: 900, transport: 900 });
  });

  it('filters by category', async () => {
    const response = await api.get('/api/v1/destinations').query({ category: 'beach' });
    expect(response.body.data.items.map((item) => item.slug)).toEqual(['goa']);
  });

  it('searches name, state and tags case-insensitively', async () => {
    const byState = await api.get('/api/v1/destinations').query({ search: 'himachal' });
    const byTag = await api.get('/api/v1/destinations').query({ search: 'SEAFOOD' });

    expect(byState.body.data.items.map((item) => item.slug)).toEqual(['manali']);
    expect(byTag.body.data.items.map((item) => item.slug)).toEqual(['goa']);
  });

  it('treats regex characters in the search text literally', async () => {
    const response = await api.get('/api/v1/destinations').query({ search: '.*' });
    expect(response.body.data.total).toBe(0);
  });

  it('paginates', async () => {
    const response = await api.get('/api/v1/destinations').query({ page: 2, limit: 1 });

    expect(response.body.data).toMatchObject({ total: 2, page: 2, limit: 1 });
    expect(response.body.data.items.map((item) => item.slug)).toEqual(['goa']);
  });

  it('rejects an unknown category', async () => {
    const response = await api.get('/api/v1/destinations').query({ category: 'moon' });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].path).toBe('category');
  });
});

describe('GET /destinations/:slug', () => {
  it('returns the destination with its activities', async () => {
    const response = await api.get('/api/v1/destinations/manali');

    expect(response.status).toBe(200);
    expect(response.body.data.destination.slug).toBe('manali');
    expect(response.body.data.activities).toHaveLength(manaliActivities.length);
    expect(response.body.data.activities[0]).toMatchObject({
      id: expect.any(String),
      destination: response.body.data.destination.id,
      source: 'seed',
    });
  });

  it('returns 404 for an unknown slug', async () => {
    const response = await api.get('/api/v1/destinations/atlantis');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /destinations/:slug/discover', () => {
  it('returns local places and names the provider in meta', async () => {
    const response = await api.get('/api/v1/destinations/manali/discover');

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ provider: 'local' });
    expect(response.body.data.items).toHaveLength(manaliActivities.length);
    expect(Object.keys(response.body.data.items[0]).sort()).toEqual(
      ['address', 'externalId', 'location', 'name', 'rating', 'source', 'type'].sort(),
    );
  });

  it('filters by type', async () => {
    const response = await api
      .get('/api/v1/destinations/manali/discover')
      .query({ type: 'adventure' });

    expect(response.body.data.items.map((item) => item.name).sort()).toEqual([
      'Rohtang Pass',
      'Solang Valley',
    ]);
  });
});

describe('GET /locations/nearest', () => {
  it('orders the catalogue by distance without storing the submitted coordinate', async () => {
    const response = await api.get('/api/v1/locations/nearest').query({
      lat: 15.4909,
      lng: 73.8278,
      limit: 2,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.items.map((item) => item.slug)).toEqual(['goa', 'manali']);
    expect(response.body.data.items[0].distanceKm).toBe(0);
    expect(response.body.data.items[0]).not.toHaveProperty('submittedLocation');
  });

  it.each([
    [{ lat: 91, lng: 73 }],
    [{ lat: 15, lng: 181 }],
    [{ lat: 15, lng: 73, limit: 13 }],
  ])('validates malformed coordinates', async (query) => {
    const response = await api.get('/api/v1/locations/nearest').query(query);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
