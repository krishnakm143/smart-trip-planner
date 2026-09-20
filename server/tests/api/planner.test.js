import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { startTestDb, stopTestDb } from '../helpers/db.js';
import { dateFromToday, planInput, seedDestination } from '../helpers/fixtures.js';

const api = request(createApp());
let destination;

beforeAll(async () => {
  await startTestDb();
  destination = await seedDestination('manali');
});
afterAll(stopTestDb);

const preview = (overrides) =>
  api.post('/api/v1/planner/preview').send(planInput(destination.id, overrides));

describe('POST /planner/preview', () => {
  it('returns destination summary, itinerary and budget without authentication', async () => {
    const response = await preview();

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ provider: 'local' });
    expect(response.body.data.destination).toEqual({
      id: destination.id,
      name: 'Manali',
      slug: 'manali',
      state: 'Himachal Pradesh',
      heroImage: '/images/destinations/manali.jpg',
    });
    expect(response.body.data.days).toBe(4);
    expect(response.body.data.itinerary).toHaveLength(4);
    expect(response.body.data.itinerary[0].date).toBe(`${dateFromToday(7)}T00:00:00.000Z`);
  });

  it('prices activities from the scheduled items', async () => {
    const { data } = (await preview()).body;
    const feesPerPerson = data.itinerary
      .flatMap((day) => day.items)
      .reduce((sum, item) => sum + item.entryFee, 0);

    expect(data.budget.breakdown.activities).toBe(feesPerPerson * 2);
    expect(data.budget).toMatchObject({ tier: 'standard', currency: 'INR', rooms: 1, nights: 3 });
    expect(data.budget.total).toBe(9000 + 7200 + 7200 + feesPerPerson * 2);
  });

  it('applies defaults for interests and pace', async () => {
    const response = await preview({ interests: undefined, pace: undefined });
    expect(response.status).toBe(200);
  });

  it('accepts a trip that starts today', async () => {
    const response = await preview({ startDate: dateFromToday(0), endDate: dateFromToday(1) });
    expect(response.status).toBe(200);
    expect(response.body.data.days).toBe(2);
  });

  it.each([
    ['a start date in the past', { startDate: dateFromToday(-1) }, 'startDate'],
    ['an end date before the start date', { endDate: dateFromToday(5) }, 'endDate'],
    ['a trip longer than 14 days', { endDate: dateFromToday(21) }, 'endDate'],
    ['an impossible date', { startDate: '2031-02-30', endDate: '2031-03-02' }, 'startDate'],
    ['zero travellers', { travelers: 0 }, 'travelers'],
    ['an unknown budget tier', { budgetTier: 'royal' }, 'budgetTier'],
    ['an unknown interest', { interests: ['gambling'] }, 'interests.0'],
    ['a malformed destination id', { destinationId: 'abc' }, 'destinationId'],
  ])('rejects %s', async (_label, overrides, path) => {
    const response = await preview(overrides);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.map((detail) => detail.path)).toContain(path);
  });

  it('returns 404 when the destination does not exist', async () => {
    const response = await preview({ destinationId: '64b7f0f0f0f0f0f0f0f0f0f0' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /budget/estimate', () => {
  it('estimates a budget with no activity cost', async () => {
    const response = await api
      .post('/api/v1/budget/estimate')
      .send({ destinationId: destination.id, days: 3, travelers: 4, budgetTier: 'economy' });

    expect(response.status).toBe(200);
    expect(response.body.data.budget).toEqual({
      tier: 'economy',
      currency: 'INR',
      rooms: 2,
      nights: 2,
      breakdown: { stay: 4800, food: 6000, transport: 4800, activities: 0 },
      total: 15600,
      perPerson: 3900,
    });
  });

  it('rejects more than 14 days', async () => {
    const response = await api
      .post('/api/v1/budget/estimate')
      .send({ destinationId: destination.id, days: 15, travelers: 2, budgetTier: 'economy' });
    expect(response.status).toBe(400);
  });
});
