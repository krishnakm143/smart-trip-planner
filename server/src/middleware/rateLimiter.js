import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { sendError } from '../utils/respond.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (_req, res) =>
    sendError(res, 429, 'RATE_LIMITED', 'Too many attempts. Please try again in a few minutes.'),
});
