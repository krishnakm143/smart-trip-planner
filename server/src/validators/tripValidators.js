import { z } from 'zod';
import { TRIP_STATUSES } from '../models/constants.js';
import { checkDateRange, planInputShape } from './plannerValidators.js';

const title = z.string().trim().min(1, 'Title cannot be empty').max(80, 'Title can be at most 80 characters');

export const createTripSchema = z
  .object({ ...planInputShape, title: title.optional() })
  .superRefine(checkDateRange);

export const listTripsQuerySchema = z.object({
  status: z.enum(TRIP_STATUSES).optional(),
});

export const updateTripSchema = z
  .object({
    title,
    notes: z.string().trim().max(1000, 'Notes can be at most 1000 characters'),
    status: z.enum(TRIP_STATUSES),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one of title, notes or status',
  });
