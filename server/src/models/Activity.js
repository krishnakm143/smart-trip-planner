import mongoose from 'mongoose';
import { ACTIVITY_SOURCES, ACTIVITY_TYPES, BEST_TIMES } from './constants.js';
import { locationSchema } from './locationSchema.js';
import { toJSONPlugin } from './plugins/toJSON.js';

const activitySchema = new mongoose.Schema(
  {
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    description: { type: String, required: true },
    location: { type: locationSchema, required: true },
    durationHours: { type: Number, required: true, min: 0.5, max: 8 },
    entryFee: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    rating: { type: Number, min: 0, max: 5 },
    bestTime: { type: String, enum: BEST_TIMES, default: 'any' },
    source: { type: String, enum: ACTIVITY_SOURCES, default: 'seed' },
    externalId: { type: String },
  },
  { timestamps: true },
);

activitySchema.index({ destination: 1, name: 1 }, { unique: true });
activitySchema.plugin(toJSONPlugin);

export const Activity = mongoose.model('Activity', activitySchema);
