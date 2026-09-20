import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/respond.js';
import { toDetails } from './validate.js';

function toApiError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return ApiError.validation('Request validation failed', toDetails(err.issues));
  }
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.validation(`Invalid value for ${err.path}`, [
      { path: err.path, message: 'Invalid value' },
    ]);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((fieldError) => ({
      path: fieldError.path,
      message: fieldError.message,
    }));
    return ApiError.validation('Request validation failed', details);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value';
    return ApiError.conflict(`That ${field} is already in use`);
  }
  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Session expired. Please log in again.');
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return ApiError.unauthorized('Invalid authentication token');
  }
  if (err.type === 'entity.parse.failed') {
    return ApiError.validation('Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return ApiError.validation('Request body is too large');
  }
  return null;
}

export function errorHandler(err, _req, res, _next) {
  const apiError = toApiError(err);
  if (apiError) {
    sendError(res, apiError.status, apiError.code, apiError.message, apiError.details);
    return;
  }

  if (!config.isTest) {
    console.error(err);
  }
  sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}
