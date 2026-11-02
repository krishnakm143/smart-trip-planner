import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/respond.js';

export async function register(req, res) {
  const session = await authService.register(req.valid.body);
  sendSuccess(res, session, { status: 201 });
}

export async function login(req, res) {
  const session = await authService.login(req.valid.body);
  sendSuccess(res, session);
}

export async function sendOtp(req, res) {
  const result = await authService.sendOtp(req.valid.body.email);
  sendSuccess(res, result);
}

export async function verifyOtp(req, res) {
  const session = await authService.verifyOtp(req.valid.body);
  sendSuccess(res, session);
}

export async function sendPasswordResetOtp(req, res) {
  const result = await authService.sendPasswordResetOtp(req.valid.body.email);
  sendSuccess(res, result);
}

export async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.valid.body);
  sendSuccess(res, result);
}

export function me(req, res) {
  sendSuccess(res, { user: authService.toPublicUser(req.user) });
}
