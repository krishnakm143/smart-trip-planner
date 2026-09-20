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

export function me(req, res) {
  sendSuccess(res, { user: authService.toPublicUser(req.user) });
}
