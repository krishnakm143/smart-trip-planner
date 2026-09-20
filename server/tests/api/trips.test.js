import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { Trip } from '../../src/models/Trip.js';
import { User } from '../../src/models/User.js';
import { startTestDb, stopTestDb } from '../helpers/db.js';
import { planInput, registerUser, seedDestination } from '../helpers/fixtures.js';

const api = request(createApp());
let destination;
let owner;
let stranger;

const as = (session) => ({ Authorization: `Bearer ${session.token}` });

const createTrip = (session, overrides) =>
  api.post('/api/v1/trips').set(as(session)).send(planInput(destination.id, overrides));

beforeAll(async () => {
  await startTestDb();
  destination = await seedDestination('manali');
});

beforeEach(async () => {
  await Promise.all([Trip.deleteMany({}), User.deleteMany({})]);
  owner = await registerUser(api);
  stranger = await registerUser(api, { name: 'Ravi Shah', email: 'ravi@example.com' });
});

afterAll(stopTestDb);

describe('authentication', () => {
  it('requires a token on every trip route', async () => {
    const responses = await Promise.all([
      api.get('/api/v1/trips'),
      api.post('/api/v1/trips').send({}),
      api.get('/api/v1/trips/64b7f0f0f0f0f0f0f0f0f0f0'),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    }
  });
});

describe('POST /trips', () => {
  it('saves a trip with a server-generated itinerary and budget', async () => {
    const response = await createTrip(owner);
    const { trip } = response.body.data;

    expect(response.status).toBe(201);
    expect(trip).toMatchObject({
      id: expect.any(String),
      user: owner.user.id,
      title: '4 days in Manali',
      days: 4,
      travelers: 2,
      budgetTier: 'standard',
      pace: 'balanced',
      status: 'planned',
      notes: '',
    });
    expect(trip.destination).toMatchObject({ id: destination.id, slug: 'manali' });
    expect(trip.itinerary).toHaveLength(4);
    expect(trip.itinerary[0].items[0]._id).toBeUndefined();
    expect(trip.itinerary[0].items[0].activity).toEqual(expect.any(String));
  });

  it('ignores client-supplied totals', async () => {
    const response = await createTrip(owner, { budget: { total: 1 }, itinerary: [], days: 1 });

    expect(response.status).toBe(201);
    expect(response.body.data.trip.days).toBe(4);
    expect(response.body.data.trip.budget.total).toBeGreaterThan(20000);
    expect(response.body.data.trip.itinerary).toHaveLength(4);
  });

  it('uses a custom title when given', async () => {
    const response = await createTrip(owner, { title: '  Summer in the hills ' });
    expect(response.body.data.trip.title).toBe('Summer in the hills');
  });

  it('matches the public preview for the same input', async () => {
    const saved = await createTrip(owner);
    const previewed = await api.post('/api/v1/planner/preview').send(planInput(destination.id));

    expect(saved.body.data.trip.itinerary).toEqual(previewed.body.data.itinerary);
    expect(saved.body.data.trip.budget).toEqual(previewed.body.data.budget);
  });

  it('validates the plan input', async () => {
    const response = await createTrip(owner, { travelers: 40 });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].path).toBe('travelers');
  });
});

describe('GET /trips', () => {
  it('lists only the caller’s trips, newest first, as summaries', async () => {
    await createTrip(owner, { title: 'First' });
    await createTrip(owner, { title: 'Second' });
    await createTrip(stranger, { title: 'Not mine' });

    const response = await api.get('/api/v1/trips').set(as(owner));
    const { items } = response.body.data;

    expect(response.status).toBe(200);
    expect(items.map((item) => item.title)).toEqual(['Second', 'First']);
    expect(Object.keys(items[0]).sort()).toEqual(
      [
        'budget',
        'budgetTier',
        'days',
        'destination',
        'endDate',
        'id',
        'startDate',
        'status',
        'title',
        'travelers',
      ].sort(),
    );
    expect(Object.keys(items[0].budget).sort()).toEqual(['perPerson', 'total']);
    expect(items[0].destination).toEqual({
      id: destination.id,
      name: 'Manali',
      slug: 'manali',
      state: 'Himachal Pradesh',
      heroImage: '/images/destinations/manali.jpg',
    });
  });

  it('filters by status', async () => {
    const created = await createTrip(owner);
    await createTrip(owner, { title: 'Still planned' });
    await api
      .patch(`/api/v1/trips/${created.body.data.trip.id}`)
      .set(as(owner))
      .send({ status: 'completed' });

    const response = await api.get('/api/v1/trips').query({ status: 'completed' }).set(as(owner));
    expect(response.body.data.items.map((item) => item.id)).toEqual([created.body.data.trip.id]);
  });
});

describe('GET /trips/:id', () => {
  it('returns the trip with the destination populated', async () => {
    const created = await createTrip(owner);
    const response = await api.get(`/api/v1/trips/${created.body.data.trip.id}`).set(as(owner));

    expect(response.status).toBe(200);
    expect(response.body.data.trip.destination).toEqual({
      id: destination.id,
      name: 'Manali',
      slug: 'manali',
      state: 'Himachal Pradesh',
      heroImage: '/images/destinations/manali.jpg',
      location: { lat: 32.2432, lng: 77.1892 },
    });
    expect(response.body.data.trip.itinerary).toEqual(created.body.data.trip.itinerary);
  });

  it('returns 400 for a malformed id', async () => {
    const response = await api.get('/api/v1/trips/not-an-id').set(as(owner));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for an unknown id', async () => {
    const response = await api.get('/api/v1/trips/64b7f0f0f0f0f0f0f0f0f0f0').set(as(owner));
    expect(response.status).toBe(404);
  });
});

describe('PATCH /trips/:id', () => {
  it('updates title, notes and status', async () => {
    const created = await createTrip(owner);
    const response = await api
      .patch(`/api/v1/trips/${created.body.data.trip.id}`)
      .set(as(owner))
      .send({ title: 'Manali with family', notes: 'Carry woollens', status: 'completed' });

    expect(response.status).toBe(200);
    expect(response.body.data.trip).toMatchObject({
      title: 'Manali with family',
      notes: 'Carry woollens',
      status: 'completed',
    });
    expect(response.body.data.trip.destination.slug).toBe('manali');
  });

  it('does not allow the plan itself to be edited', async () => {
    const created = await createTrip(owner);
    const response = await api
      .patch(`/api/v1/trips/${created.body.data.trip.id}`)
      .set(as(owner))
      .send({ notes: 'ok', travelers: 9, budget: { total: 1 } });

    expect(response.body.data.trip.travelers).toBe(2);
    expect(response.body.data.trip.budget).toEqual(created.body.data.trip.budget);
  });

  it.each([
    ['an empty body', {}],
    ['an unknown status', { status: 'archived' }],
    ['notes over 1000 characters', { notes: 'x'.repeat(1001) }],
  ])('rejects %s', async (_label, body) => {
    const created = await createTrip(owner);
    const response = await api
      .patch(`/api/v1/trips/${created.body.data.trip.id}`)
      .set(as(owner))
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /trips/:id', () => {
  it('deletes the trip and returns its id', async () => {
    const created = await createTrip(owner);
    const { id } = created.body.data.trip;

    const response = await api.delete(`/api/v1/trips/${id}`).set(as(owner));
    const afterwards = await api.get(`/api/v1/trips/${id}`).set(as(owner));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id });
    expect(afterwards.status).toBe(404);
  });
});

describe('ownership isolation', () => {
  it('answers 404 when another user reads, edits or deletes a trip', async () => {
    const created = await createTrip(owner);
    const url = `/api/v1/trips/${created.body.data.trip.id}`;

    const responses = await Promise.all([
      api.get(url).set(as(stranger)),
      api.patch(url).set(as(stranger)).send({ notes: 'hijacked' }),
      api.delete(url).set(as(stranger)),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    }

    const untouched = await api.get(url).set(as(owner));
    expect(untouched.status).toBe(200);
    expect(untouched.body.data.trip.notes).toBe('');
  });
});
