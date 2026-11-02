import { authenticateToken } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized();
  }

  req.user = await authenticateToken(token);
  // Supabase trip storage uses this verified user token to let Postgres RLS
  // enforce ownership. It is never returned in an API response or persisted.
  req.accessToken = token;
  next();
});
