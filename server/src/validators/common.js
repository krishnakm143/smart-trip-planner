import mongoose from 'mongoose';
import { z } from 'zod';

export const objectId = z
  .string()
  .refine((value) => mongoose.isValidObjectId(value), { message: 'Must be a valid id' });

export const idParamSchema = z.object({ id: objectId });
