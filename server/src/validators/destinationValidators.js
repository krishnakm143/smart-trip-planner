import { z } from 'zod';
import { ACTIVITY_TYPES, DESTINATION_CATEGORIES } from '../models/constants.js';

const MAX_LIMIT = 50;

export const listDestinationsQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
  category: z.enum(DESTINATION_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(12)
    .transform((value) => Math.min(value, MAX_LIMIT)),
});

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Must be a valid destination slug'),
});

export const discoverQuerySchema = z.object({
  type: z.enum(ACTIVITY_TYPES).optional(),
});
