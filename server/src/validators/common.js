import mongoose from 'mongoose';
import { z } from 'zod';

export const objectId = z
  .string()
  .refine((value) => mongoose.isValidObjectId(value), { message: 'Must be a valid id' });

const tripId = z.union([objectId, z.string().uuid('Must be a valid id')]);

// MongoDB uses ObjectIds; the Supabase-backed trip store uses UUIDs.
export const idParamSchema = z.object({ id: tripId });
export const expenseIdParamSchema = z.object({ id: tripId, expenseId: tripId });
