import mongoose from 'mongoose';
import {
  ACTIVITY_TYPES,
  BUDGET_TIERS,
  PACES,
  PACKING_CATEGORIES,
  RESERVATION_STATUSES,
  RESERVATION_TYPES,
  TRIP_MODES,
  TRIP_STATUSES,
} from './constants.js';
import { locationSchema } from './locationSchema.js';
import { toJSONPlugin } from './plugins/toJSON.js';

const itineraryItemSchema = new mongoose.Schema(
  {
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: false },
    name: { type: String, required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    location: { type: locationSchema, required: false },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    durationHours: { type: Number, required: true },
    entryFee: { type: Number, default: 0 },
    travelKmFromPrev: { type: Number, default: 0 },
    travelMinutesFromPrev: { type: Number, default: 0 },
    notes: { type: String },
    isCustom: { type: Boolean },
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
      shopping: { type: Number },
      intercityTravel: { type: Number, min: 0 },
      contingency: { type: Number, min: 0 },
    },
    total: { type: Number, required: true },
    perPerson: { type: Number, required: true },
    target: { type: Number, min: 1 },
    difference: { type: Number },
    isWithinTarget: { type: Boolean },
  },
  { _id: false },
);

const packingItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    category: { type: String, enum: PACKING_CATEGORIES, default: 'clothing' },
    item: { type: String, required: true },
    packed: { type: Boolean, default: false },
    assignedTo: { type: String, default: '' },
  },
  { _id: false },
);

const reservationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: RESERVATION_TYPES, default: 'other' },
    title: { type: String, required: true },
    provider: { type: String, default: '' },
    confirmationCode: { type: String, default: '' },
    startDateTime: { type: String, default: '' },
    endDateTime: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'confirmed' },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const collaboratorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
  },
  { _id: false },
);

const tripSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    origin: { type: String, default: '', trim: true, maxlength: 80 },
    tripMode: { type: String, enum: TRIP_MODES, default: 'solo' },
    members: [{ type: String, trim: true }],
    collaborators: [collaboratorSchema],
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
    packingList: [packingItemSchema],
    reservations: [reservationSchema],
    status: { type: String, enum: TRIP_STATUSES, default: 'planned' },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true },
);

tripSchema.plugin(toJSONPlugin);

export const Trip = mongoose.model('Trip', tripSchema);
