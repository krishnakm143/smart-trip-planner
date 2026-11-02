import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { Trip } from '../../src/models/Trip.js';
import { User } from '../../src/models/User.js';
import { Expense } from '../../src/models/Expense.js';
import { startTestDb, stopTestDb } from '../helpers/db.js';
import { planInput, registerUser, seedDestination } from '../helpers/fixtures.js';
import { calculateSettlements } from '../../src/services/expenseService.js';

const api = request(createApp());
let destination;
let owner;

const as = (session) => ({ Authorization: `Bearer ${session.token}` });
const createTrip = (session, overrides) =>
  api.post('/api/v1/trips').set(as(session)).send(planInput(destination.id, overrides));

beforeAll(async () => {
  await startTestDb();
  destination = await seedDestination('manali');
});

beforeEach(async () => {
  await Promise.all([Trip.deleteMany({}), User.deleteMany({}), Expense.deleteMany({})]);
  owner = await registerUser(api);
});

afterAll(stopTestDb);

describe('Duplicate trip endpoint', () => {
  it('duplicates an existing trip with new id and Copy of prefix', async () => {
    const created = await createTrip(owner, { title: 'Himachal Adventure' });
    const originalId = created.body.data.trip.id;

    const dupResponse = await api
      .post(`/api/v1/trips/${originalId}/duplicate`)
      .set(as(owner));

    expect(dupResponse.status).toBe(201);
    const duplicated = dupResponse.body.data.trip;
    expect(duplicated.id).not.toBe(originalId);
    expect(duplicated.title).toBe('Copy of Himachal Adventure');
    expect(duplicated.status).toBe('planned');
    expect(duplicated.days).toBe(created.body.data.trip.days);
    expect(duplicated.itinerary.length).toBe(created.body.data.trip.itinerary.length);
  });
});

describe('Extended Trip updating (packing, reservations, members)', () => {
  it('updates origin, tripMode, members, packing list, and reservations', async () => {
    const created = await createTrip(owner);
    const tripId = created.body.data.trip.id;

    const updateResponse = await api
      .patch(`/api/v1/trips/${tripId}`)
      .set(as(owner))
      .send({
        origin: 'Chandigarh',
        tripMode: 'friends',
        members: ['Me', 'Aarav', 'Neha'],
        packingList: [
          { id: 'p1', category: 'clothing', item: 'Fleece Jacket', packed: true, assignedTo: 'Me' },
          { id: 'p2', category: 'documents', item: 'Aadhaar Card', packed: false, assignedTo: 'Aarav' },
        ],
        reservations: [
          {
            id: 'r1',
            type: 'hotel',
            title: 'Himalayan Apple Resort',
            provider: 'Booking.com',
            confirmationCode: 'HAR-9921',
            cost: 8500,
            status: 'confirmed',
          },
        ],
      });

    expect(updateResponse.status).toBe(200);
    const updated = updateResponse.body.data.trip;
    expect(updated.origin).toBe('Chandigarh');
    expect(updated.tripMode).toBe('friends');
    expect(updated.members).toEqual(['Me', 'Aarav', 'Neha']);
    expect(updated.packingList.length).toBe(2);
    expect(updated.packingList[0].item).toBe('Fleece Jacket');
    expect(updated.packingList[0].packed).toBe(true);
    expect(updated.reservations.length).toBe(1);
    expect(updated.reservations[0].confirmationCode).toBe('HAR-9921');
  });
});

describe('Expense Management and Settlements', () => {
  it('creates expenses with payment method, paidBy, and split details', async () => {
    const created = await createTrip(owner);
    const tripId = created.body.data.trip.id;

    const expenseRes = await api
      .post(`/api/v1/trips/${tripId}/expenses`)
      .set(as(owner))
      .send({
        title: 'River Rafting & Zip-lining',
        amount: 3000,
        category: 'activities',
        spentOn: '2026-11-05',
        paymentMethod: 'upi',
        paidBy: 'Me',
        splitType: 'equal',
        splits: [
          { member: 'Me', amount: 1500, settled: true },
          { member: 'Aarav', amount: 1500, settled: false },
        ],
      });

    expect(expenseRes.status).toBe(201);
    const exp = expenseRes.body.data.expense;
    expect(exp.title).toBe('River Rafting & Zip-lining');
    expect(exp.paymentMethod).toBe('upi');
    expect(exp.paidBy).toBe('Me');
    expect(exp.splits.length).toBe(2);
  });

  it('calculates deterministic debt simplification (who owes whom)', () => {
    const members = ['Alice', 'Bob', 'Charlie'];
    const mockExpenses = [
      {
        title: 'Dinner at Johnson Cafe',
        amount: 3000,
        category: 'food',
        paidBy: 'Alice',
        splits: [
          { member: 'Alice', amount: 1000 },
          { member: 'Bob', amount: 1000 },
          { member: 'Charlie', amount: 1000 },
        ],
      },
      {
        title: 'Taxi to Rohtang',
        amount: 3000,
        category: 'transport',
        paidBy: 'Bob',
        splits: [
          { member: 'Alice', amount: 1000 },
          { member: 'Bob', amount: 1000 },
          { member: 'Charlie', amount: 1000 },
        ],
      },
    ];

    const result = calculateSettlements(members, mockExpenses);
    expect(result.totalSpent).toBe(6000);
    expect(result.byCategory.food).toBe(3000);
    expect(result.byCategory.transport).toBe(3000);
    // Alice paid 3000, consumed 2000 => net +1000
    // Bob paid 3000, consumed 2000 => net +1000
    // Charlie paid 0, consumed 2000 => net -2000
    // Simplified settlements: Charlie owes Alice 1000, Charlie owes Bob 1000
    expect(result.settlements.length).toBe(2);
    expect(result.settlements).toContainEqual({ from: 'Charlie', to: 'Alice', amount: 1000 });
    expect(result.settlements).toContainEqual({ from: 'Charlie', to: 'Bob', amount: 1000 });
  });

  it('provides expense summary and settlements endpoint', async () => {
    const created = await createTrip(owner);
    const tripId = created.body.data.trip.id;

    await api
      .patch(`/api/v1/trips/${tripId}`)
      .set(as(owner))
      .send({ members: ['Me', 'Rohan'] });

    await api
      .post(`/api/v1/trips/${tripId}/expenses`)
      .set(as(owner))
      .send({
        title: 'Hotel Booking',
        amount: 4000,
        category: 'stay',
        spentOn: '2026-11-05',
        paidBy: 'Me',
      });

    const summaryRes = await api
      .get(`/api/v1/trips/${tripId}/expenses/summary`)
      .set(as(owner));

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.totalSpent).toBe(4000);
    expect(summaryRes.body.data.byCategory.stay).toBe(4000);
    expect(summaryRes.body.data.settlements).toEqual([
      { from: 'Rohan', to: 'Me', amount: 2000 },
    ]);
  });
});

describe('AI Travel Assistant & Recommendations', () => {
  it('answers travel questions using intelligent domain assistant', async () => {
    const created = await createTrip(owner);
    const tripId = created.body.data.trip.id;

    const askRes = await api
      .post(`/api/v1/trips/${tripId}/assistant`)
      .set(as(owner))
      .send({ question: 'What clothes should I pack for this trip?' });

    expect(askRes.status).toBe(200);
    expect(askRes.body.data.answer).toContain('Packing Recommendations');
  });

  it('recommends destinations matching budget and duration', async () => {
    const recRes = await api
      .post('/api/v1/planner/recommend')
      .send({ maxBudget: 40000, days: 4, travelers: 2 });

    expect(recRes.status).toBe(200);
    const { recommendations } = recRes.body.data;
    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].destination).toBeDefined();
    expect(recommendations[0].estimatedBudget).toBeDefined();
  });
});
