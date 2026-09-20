import { z } from 'zod';
import { ACTIVITY_TYPES, BUDGET_TIERS, PACES } from '../models/constants.js';
import { daysBetweenInclusive, isRealDate, parseDateOnly, todayDateOnly } from '../utils/time.js';
import { objectId } from './common.js';

export const MAX_TRIP_DAYS = 14;

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine(isRealDate, { message: 'Must be a real calendar date' });

const travelers = z.number().int().min(1, 'At least 1 traveller').max(12, 'At most 12 travellers');

export const planInputShape = {
  destinationId: objectId,
  startDate: dateOnly,
  endDate: dateOnly,
  travelers,
  budgetTier: z.enum(BUDGET_TIERS),
  interests: z
    .array(z.enum(ACTIVITY_TYPES))
    .default([])
    .transform((values) => [...new Set(values)]),
  pace: z.enum(PACES).default('balanced'),
};

export function checkDateRange(input, ctx) {
  // ISO date strings compare correctly as plain strings.
  if (input.startDate < todayDateOnly()) {
    ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date cannot be in the past' });
  }
  if (input.endDate < input.startDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'End date must be on or after the start date',
    });
    return;
  }
  const days = daysBetweenInclusive(parseDateOnly(input.startDate), parseDateOnly(input.endDate));
  if (days > MAX_TRIP_DAYS) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: `A trip can be at most ${MAX_TRIP_DAYS} days long`,
    });
  }
}

export const planInputSchema = z.object(planInputShape).superRefine(checkDateRange);

export const budgetEstimateSchema = z.object({
  destinationId: objectId,
  days: z.number().int().min(1).max(MAX_TRIP_DAYS),
  travelers,
  budgetTier: z.enum(BUDGET_TIERS),
});
