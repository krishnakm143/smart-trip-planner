import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db.js';
import { dateFromToday, seedDestination } from '../helpers/fixtures.js';

const api = request(createApp());
let destination;

beforeAll(async () => {
  await startTestDb();
  await clearTestDb();
  destination = await seedDestination('manali');
});

afterAll(stopTestDb);

describe('Security: Email Validation & Fake / Disposable Email Protection', () => {
  it.each([
    ['missing local-part before @', '@abc.com'],
    ['dummy domain abc.com', 'user@abc.com'],
    ['disposable domain mailinator.com', 'traveler@mailinator.com'],
    ['disposable domain tempmail.com', 'hacker@tempmail.com'],
    ['disposable domain fake.com', 'someone@fake.com'],
    ['disposable domain 10minutemail.com', 'fast@10minutemail.com'],
    ['disposable domain guerrillamail.com', 'anon@guerrillamail.com'],
    ['single-letter TLD', 'person@domain.c'],
    ['consecutive dots in local part', 'first..last@gmail.com'],
    ['leading dot in local part', '.traveler@gmail.com'],
    ['no domain extension', 'user@localhost'],
    ['no @ symbol', 'plainaddress'],
  ])('rejects invalid or fake email "%s" (%s)', async (_label, email) => {
    const res = await api.post('/api/v1/auth/register').send({
      name: 'Security Test',
      email,
      password: 'SecurePassword@123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const emailError = res.body.error.details.find((d) => d.path === 'email');
    expect(emailError).toBeDefined();
    expect(emailError.message).toBeTruthy();
  });

  it('rejects passwords consisting only of whitespace', async () => {
    const res = await api.post('/api/v1/auth/register').send({
      name: 'Whitespace Test',
      email: 'valid.user@gmail.com',
      password: '        ',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const pwdError = res.body.error.details.find((d) => d.path === 'password');
    expect(pwdError).toBeDefined();
  });

  it('accepts legitimate personal and corporate emails', async () => {
    const res = await api.post('/api/v1/auth/register').send({
      name: 'Priya Sharma',
      email: 'priya.sharma@gmail.com',
      password: 'StrongPassword@123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('priya.sharma@gmail.com');
  });
});

describe('Feature: User Enters Target Budget to Drive Plan Itinerary', () => {
  it('automatically derives Economy tier when user enters a budget matching economical travel', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: destination.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10),
      travelers: 2,
      maxBudget: 18000, // Budget is tight, fits economy
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.budget.tier).toBe('economy');
    expect(res.body.data.budget.target).toBe(18000);
    expect(typeof res.body.data.budget.difference).toBe('number');
  });

  it('automatically derives Luxury tier when user enters a generous budget', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: destination.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10),
      travelers: 2,
      maxBudget: 90000, // High budget, comfortably affords luxury
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.budget.tier).toBe('luxury');
    expect(res.body.data.budget.target).toBe(90000);
    expect(res.body.data.budget.isWithinTarget).toBe(true);
  });

  it('automatically derives Standard tier for medium budget', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: destination.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10),
      travelers: 2,
      maxBudget: 35000,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.budget.tier).toBe('standard');
    expect(res.body.data.budget.target).toBe(35000);
  });
});

describe('Security & Edge Cases: IDOR & Negative Number Injection', () => {
  let userAToken;
  let userBToken;
  let userATripId;

  beforeAll(async () => {
    const regA = await api.post('/api/v1/auth/register').send({
      name: 'User Alpha',
      email: 'alpha@mycompany.org',
      password: 'Password@123',
    });
    userAToken = regA.body.data.token;

    const regB = await api.post('/api/v1/auth/register').send({
      name: 'User Beta',
      email: 'beta@mycompany.org',
      password: 'Password@123',
    });
    userBToken = regB.body.data.token;

    const tripRes = await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        destinationId: destination.id,
        startDate: dateFromToday(14),
        endDate: dateFromToday(17),
        travelers: 2,
        budgetTier: 'standard',
        title: "Alpha's Private Trip",
      });
    userATripId = tripRes.body.data.trip.id;
  });

  it('prevents User B from accessing User A trip (IDOR protection)', async () => {
    const res = await api
      .get(`/api/v1/trips/${userATripId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('prevents User B from deleting User A trip', async () => {
    const res = await api
      .delete(`/api/v1/trips/${userATripId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('prevents User B from logging expenses on User A trip', async () => {
    const res = await api
      .post(`/api/v1/trips/${userATripId}/expenses`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        title: 'Unauthorized Cab',
        amount: 500,
        category: 'transport',
        spentOn: dateFromToday(0),
      });

    expect(res.status).toBe(404);
  });

  it('rejects negative or zero amounts in expenses', async () => {
    const res = await api
      .post(`/api/v1/trips/${userATripId}/expenses`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Negative Hack',
        amount: -500,
        category: 'food',
        spentOn: dateFromToday(0),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
