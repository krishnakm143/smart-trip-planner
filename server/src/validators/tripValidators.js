import { z } from 'zod';
import {
  ACTIVITY_TYPES,
  BUDGET_TIERS,
  RESERVATION_STATUSES,
  RESERVATION_TYPES,
  TRIP_MODES,
  TRIP_STATUSES,
} from '../models/constants.js';
import { checkDateRange, planInputShape } from './plannerValidators.js';

const title = z.string().trim().min(1, 'Title cannot be empty').max(80, 'Title can be at most 80 characters');

export const packingItemSchema = z.object({
  id: z.string(),
  category: z.string().default('clothing'),
  item: z.string().trim().min(1).max(100),
  packed: z.boolean().default(false),
  assignedTo: z.string().trim().default(''),
});

export const reservationSchema = z.object({
  id: z.string(),
  type: z.enum(RESERVATION_TYPES).default('other'),
  title: z.string().trim().min(1).max(100),
  provider: z.string().trim().max(100).optional().default(''),
  confirmationCode: z.string().trim().max(50).optional().default(''),
  startDateTime: z.string().trim().optional().default(''),
  endDateTime: z.string().trim().optional().default(''),
  cost: z.number().min(0).optional().default(0),
  status: z.enum(RESERVATION_STATUSES).default('confirmed'),
  notes: z.string().trim().max(500).optional().default(''),
});

export const itineraryItemSchema = z.object({
  activity: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(ACTIVITY_TYPES),
  location: z
    .object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
      address: z.string().optional(),
    })
    .optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(0.1).max(24),
  entryFee: z.number().min(0).default(0),
  travelKmFromPrev: z.number().min(0).default(0),
  travelMinutesFromPrev: z.number().min(0).default(0),
  notes: z.string().trim().max(300).optional(),
  isCustom: z.boolean().optional(),
});

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  date: z.union([z.string(), z.date()]),
  items: z.array(itineraryItemSchema),
  totalVisitHours: z.number().optional().default(0),
  totalTravelKm: z.number().optional().default(0),
  note: z.string().optional().default(''),
});

export const budgetUpdateSchema = z.object({
  tier: z.enum(BUDGET_TIERS).optional(),
  currency: z.string().optional(),
  rooms: z.number().int().min(1).optional(),
  nights: z.number().int().min(1).optional(),
  breakdown: z.record(z.string(), z.number()).optional(),
  total: z.number().min(0).optional(),
  perPerson: z.number().min(0).optional(),
  target: z.number().min(1).optional(),
  difference: z.number().optional(),
  isWithinTarget: z.boolean().optional(),
});

export const createTripSchema = z
  .object({
    ...planInputShape,
    title: title.optional(),
    origin: z.string().trim().max(80).optional(),
    tripMode: z.enum(TRIP_MODES).optional(),
    members: z.array(z.string().trim().min(1).max(50)).optional(),
    packingList: z.array(packingItemSchema).optional(),
    reservations: z.array(reservationSchema).optional(),
  })
  .superRefine(checkDateRange);

export const listTripsQuerySchema = z.object({
  status: z.enum(TRIP_STATUSES).optional(),
});

export const updateTripSchema = z
  .object({
    title,
    notes: z.string().trim().max(1000, 'Notes can be at most 1000 characters'),
    status: z.enum(TRIP_STATUSES),
    origin: z.string().trim().max(80),
    tripMode: z.enum(TRIP_MODES),
    members: z.array(z.string().trim().min(1).max(50)),
    itinerary: z.array(itineraryDaySchema),
    packingList: z.array(packingItemSchema),
    reservations: z.array(reservationSchema),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one trip field to update',
  });
