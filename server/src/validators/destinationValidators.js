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
  includeExternal: z.coerce.boolean().optional().default(false),
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

export const searchExternalQuerySchema = z.object({
  q: z.string().trim().min(2, 'Query must have at least 2 characters').max(100),
});

export const dynamicDestinationSchema = z.object({
  query: z.string().trim().min(2).optional(),
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  category: z.enum(DESTINATION_CATEGORIES).optional(),
  tagline: z.string().max(120).optional(),
  description: z.string().optional(),
  heroImage: z.string().optional(),
  location: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .optional(),
  bestSeason: z.string().optional(),
  idealDays: z
    .object({
      min: z.coerce.number().int().min(1),
      max: z.coerce.number().int().min(1),
    })
    .optional(),
  dailyCost: z
    .object({
      economy: z.object({ stay: z.number(), food: z.number(), transport: z.number() }),
      standard: z.object({ stay: z.number(), food: z.number(), transport: z.number() }),
      luxury: z.object({ stay: z.number(), food: z.number(), transport: z.number() }),
    })
    .optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  tags: z.array(z.string()).optional(),
}).refine((data) => Boolean(data.query || data.name), {
  message: 'Either query or name is required',
  path: ['name'],
});

