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

describe('Brevo Integration: Passwordless OTP Authentication', () => {
  const testEmail = 'traveler.otp@gmail.com';
  let generatedOtp = '';

  it('rejects OTP send for disposable or fake email addresses', async () => {
    const res = await api.post('/api/v1/auth/otp/send').send({ email: 'fake@mailinator.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sends OTP for valid email and provides debug code in test environment', async () => {
    const res = await api.post('/api/v1/auth/otp/send').send({ email: testEmail });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Verification code sent');
    expect(res.body.data.debugCode).toBeDefined();
    expect(res.body.data.debugCode).toMatch(/^\d{6}$/);
    generatedOtp = res.body.data.debugCode;
  });

  it('rejects invalid or wrong OTP code', async () => {
    const res = await api.post('/api/v1/auth/otp/verify').send({
      email: testEmail,
      code: '999999',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('verifies valid OTP, creates account on the fly, and logs user in with token', async () => {
    const res = await api.post('/api/v1/auth/otp/verify').send({
      email: testEmail,
      code: generatedOtp,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.role).toBe('traveler');
  });

  it('prevents OTP replay attack (OTP is deleted after successful verification)', async () => {
    const res = await api.post('/api/v1/auth/otp/verify').send({
      email: testEmail,
      code: generatedOtp,
    });
    expect(res.status).toBe(401);
  });
});

describe('Brevo Integration: Email Trip Itinerary to Traveler', () => {
  let authToken = '';
  let tripId = '';

  beforeAll(async () => {
    const reg = await api.post('/api/v1/auth/register').send({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@gmail.com',
      password: 'Password@123',
    });
    authToken = reg.body.data.token;

    const trip = await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        destinationId: destination.id,
        startDate: dateFromToday(10),
        endDate: dateFromToday(14),
        travelers: 2,
        budgetTier: 'standard',
        title: 'Manali Mountain Getaway',
      });
    tripId = trip.body.data.trip.id;
  });

  it('emails trip itinerary successfully via Brevo service', async () => {
    const res = await api
      .post(`/api/v1/trips/${tripId}/email`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ email: 'rohan.sharma@gmail.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Trip plan sent to rohan.sharma@gmail.com');
  });

  it('rejects emailing trip when unauthorized', async () => {
    const res = await api.post(`/api/v1/trips/${tripId}/email`).send({});
    expect(res.status).toBe(401);
  });
});

describe('Brevo Integration: Forgot Password & OTP Reset Flow', () => {
  const resetEmail = 'reset.user@gmail.com';
  let resetOtp = '';

  beforeAll(async () => {
    await api.post('/api/v1/auth/register').send({
      name: 'Reset Test User',
      email: resetEmail,
      password: 'OldPassword@123',
    });
  });

  it('rejects password reset OTP request for invalid/disposable email', async () => {
    const res = await api.post('/api/v1/auth/password/reset-otp').send({ email: 'spammer@trashmail.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sends password reset OTP for registered user and gives debugCode in test mode', async () => {
    const res = await api.post('/api/v1/auth/password/reset-otp').send({ email: resetEmail });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Verification code sent');
    expect(res.body.data.debugCode).toBeDefined();
    expect(res.body.data.debugCode).toMatch(/^\d{6}$/);
    resetOtp = res.body.data.debugCode;
  });

  it('rejects password reset with incorrect OTP code', async () => {
    const res = await api.post('/api/v1/auth/password/reset').send({
      email: resetEmail,
      code: '000000',
      newPassword: 'BrandNewPassword@456',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects password reset with weak/short new password', async () => {
    const res = await api.post('/api/v1/auth/password/reset').send({
      email: resetEmail,
      code: resetOtp,
      newPassword: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully resets password using valid OTP', async () => {
    const res = await api.post('/api/v1/auth/password/reset').send({
      email: resetEmail,
      code: resetOtp,
      newPassword: 'BrandNewPassword@456',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Your password has been reset successfully');
  });

  it('allows logging in with the newly reset password', async () => {
    const res = await api.post('/api/v1/auth/login').send({
      email: resetEmail,
      password: 'BrandNewPassword@456',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(resetEmail);
  });

  it('rejects logging in with the old password after reset', async () => {
    const res = await api.post('/api/v1/auth/login').send({
      email: resetEmail,
      password: 'OldPassword@123',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('prevents OTP reuse for password reset after successful reset', async () => {
    const res = await api.post('/api/v1/auth/password/reset').send({
      email: resetEmail,
      code: resetOtp,
      newPassword: 'AnotherPassword@789',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects password reset OTP request for an unregistered email address', async () => {
    const res = await api.post('/api/v1/auth/password/reset-otp').send({ email: 'unregistered.user@gmail.com' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('invalidates earlier OTP when a fresh OTP is requested on resend', async () => {
    const req1 = await api.post('/api/v1/auth/password/reset-otp').send({ email: resetEmail });
    expect(req1.status).toBe(200);
    const otp1 = req1.body.data.debugCode;

    const req2 = await api.post('/api/v1/auth/password/reset-otp').send({ email: resetEmail });
    expect(req2.status).toBe(200);
    const otp2 = req2.body.data.debugCode;

    // Earlier OTP should be rejected
    const failRes = await api.post('/api/v1/auth/password/reset').send({
      email: resetEmail,
      code: otp1,
      newPassword: 'BrandNewPassword@888',
    });
    expect(failRes.status).toBe(401);

    // Newest OTP should be accepted
    const successRes = await api.post('/api/v1/auth/password/reset').send({
      email: resetEmail,
      code: otp2,
      newPassword: 'BrandNewPassword@888',
    });
    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
  });
});
