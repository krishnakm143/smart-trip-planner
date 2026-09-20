import mongoose from 'mongoose';
import { DESTINATION_CATEGORIES } from './constants.js';
import { locationSchema } from './locationSchema.js';
import { toJSONPlugin } from './plugins/toJSON.js';

const rupees = { type: Number, required: true, min: 0, validate: Number.isInteger };

const tierCostSchema = new mongoose.Schema(
  { stay: rupees, food: rupees, transport: rupees },
  { _id: false },
);

const dailyCostSchema = new mongoose.Schema(
  {
    economy: { type: tierCostSchema, required: true },
    standard: { type: tierCostSchema, required: true },
    luxury: { type: tierCostSchema, required: true },
  },
  { _id: false },
);

const idealDaysSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 1 },
    max: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, default: 'India' },
    category: { type: String, enum: DESTINATION_CATEGORIES, required: true },
    tagline: { type: String, required: true, maxlength: 90 },
    description: { type: String, required: true },
    heroImage: { type: String, required: true },
    location: { type: locationSchema, required: true },
    bestSeason: { type: String, required: true },
    idealDays: { type: idealDaysSchema, required: true },
    dailyCost: { type: dailyCostSchema, required: true },
    rating: { type: Number, min: 0, max: 5 },
    tags: [String],
  },
  { timestamps: true },
);

destinationSchema.plugin(toJSONPlugin);

export const Destination = mongoose.model('Destination', destinationSchema);
