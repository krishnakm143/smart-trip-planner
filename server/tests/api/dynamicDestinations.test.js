import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { startTestDb, stopTestDb } from '../helpers/db.js';
import { seedDestination } from '../helpers/fixtures.js';

const api = request(createApp());

beforeAll(async () => {
  await startTestDb();
  await seedDestination('manali');
  await seedDestination('goa');
});

afterAll(stopTestDb);

describe('Dynamic Destinations & External Places API', () => {
  describe('GET /api/v1/destinations/external/search', () => {
    it('validates query parameter presence and minimum length', async () => {
      const resEmpty = await api.get('/api/v1/destinations/external/search');
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error.code).toBe('VALIDATION_ERROR');

      const resShort = await api.get('/api/v1/destinations/external/search').query({ q: 'a' });
      expect(resShort.status).toBe(400);
      expect(resShort.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns an items array of candidate destinations for a valid query', async () => {
      const res = await api.get('/api/v1/destinations/external/search').query({ q: 'Vadodara' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('POST /api/v1/destinations/dynamic', () => {
    it('rejects an empty body with 400 validation error', async () => {
      const res = await api.post('/api/v1/destinations/dynamic').send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates or imports a dynamic destination and returns 201', async () => {
      const payload = {
        name: 'Pavagadh Hill',
        slug: 'pavagadh-hill-test',
        state: 'Gujarat',
        country: 'India',
        category: 'heritage',
        tagline: 'Ancient hill fortress and sacred temple atop Pavagadh',
        description: 'A famous historical and spiritual destination near Vadodara featuring Kalika Mata temple.',
        location: { lat: 22.462, lng: 73.5241 },
        dailyCost: {
          economy: { stay: 1000, food: 400, transport: 300 },
          standard: { stay: 2500, food: 800, transport: 700 },
          luxury: { stay: 7000, food: 1800, transport: 1600 },
        },
        rating: 4.7,
        tags: ['temple', 'fort', 'gujarat'],
      };

      const res = await api.post('/api/v1/destinations/dynamic').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.destination.name).toBe('Pavagadh Hill');
      expect(res.body.data.destination.slug).toBe('pavagadh-hill-test');
      expect(res.body.data.destination.location).toEqual({ lat: 22.462, lng: 73.5241 });

      // Verify it can now be retrieved via GET /destinations/:slug
      const getRes = await api.get('/api/v1/destinations/pavagadh-hill-test');
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.destination.name).toBe('Pavagadh Hill');
    });

    it('handles idempotent creation when the destination already exists', async () => {
      const payload = {
        name: 'Pavagadh Hill',
        slug: 'pavagadh-hill-test',
        state: 'Gujarat',
        location: { lat: 22.462, lng: 73.5241 },
      };

      const res = await api.post('/api/v1/destinations/dynamic').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.data.destination.slug).toBe('pavagadh-hill-test');
    });
  });

  describe('Nearby Location Range Verification (Vadodara & Pavagadh)', () => {
    it('accurately identifies nearby places from Vadodara coordinates instead of 350km away', async () => {
      const vadodaraCoords = { lat: 22.3072, lng: 73.1812 };
      const res = await api.get('/api/v1/locations/nearest').query({
        lat: vadodaraCoords.lat,
        lng: vadodaraCoords.lng,
        limit: 4,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data.items;

      expect(items.length).toBeGreaterThanOrEqual(2);
      // The first item should be a local destination in Gujarat (e.g. Vadodara or Pavagadh)
      const firstItem = items[0];
      expect(firstItem.state).toBe('Gujarat');
      expect(firstItem.distanceKm).toBeLessThan(60);
    });
  });
});
