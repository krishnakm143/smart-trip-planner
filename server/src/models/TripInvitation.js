import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

const tripInvitationSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tripInvitationSchema.index({ trip: 1, email: 1 }, { unique: true });
tripInvitationSchema.plugin(toJSONPlugin);

export const TripInvitation = mongoose.model('TripInvitation', tripInvitationSchema);
