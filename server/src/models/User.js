import mongoose from 'mongoose';
import { USER_ROLES } from './constants.js';
import { toJSONPlugin } from './plugins/toJSON.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'traveler' },
  },
  { timestamps: true },
);

userSchema.plugin(toJSONPlugin);

export const User = mongoose.model('User', userSchema);
