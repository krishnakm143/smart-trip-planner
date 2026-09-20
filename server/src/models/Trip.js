import mongoose from 'mongoose';
import { ACTIVITY_TYPES, BUDGET_TIERS, PACES, TRIP_STATUSES } from './constants.js';
import { locationSchema } from './locationSchema.js';
import { toJSONPlugin } from './plugins/toJSON.js';

const itineraryItemSchema = new mongoose.Schema(
  {
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    location: { type: locationSchema, required: true },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    durationHours: { type: Number, required: true },
    entryFee: { type: Number, default: 0 },
    travelKmFromPrev: { type: Number, default: 0 },
    travelMinutesFromPrev: { type: Number, default: 0 },
  },
  { _id: false },
);

const itineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    date: { type: Date, required: true },
    items: [itineraryItemSchema],
    totalVisitHours: { type: Number, default: 0 },
    totalTravelKm: { type: Number, default: 0 },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const budgetSchema = new mongoose.Schema(
  {
    tier: { type: String, enum: BUDGET_TIERS, required: true },
    currency: { type: String, default: 'INR' },
    rooms: { type: Number, required: true },
    nights: { type: Number, required: true },
    breakdown: {
      stay: { type: Number, required: true },
      food: { type: Number, required: true },
      transport: { type: Number, required: true },
      activities: { type: Number, required: true },
    },
    total: { type: Number, required: true },
    perPerson: { type: Number, required: true },
  },
  { _id: false },
);

const tripSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value >= this.startDate;
        },
        message: 'endDate must be on or after startDate',
      },
    },
    days: { type: Number, required: true, min: 1, max: 14 },
    travelers: { type: Number, required: true, min: 1, max: 12 },
    budgetTier: { type: String, enum: BUDGET_TIERS, required: true },
    interests: [{ type: String, enum: ACTIVITY_TYPES }],
    pace: { type: String, enum: PACES, default: 'balanced' },
    itinerary: [itineraryDaySchema],
    budget: { type: budgetSchema, required: true },
    status: { type: String, enum: TRIP_STATUSES, default: 'planned' },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true },
);

tripSchema.plugin(toJSONPlugin);

export const Trip = mongoose.model('Trip', tripSchema);
