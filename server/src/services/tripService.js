import { Trip } from '../models/Trip.js';
import { TripInvitation } from '../models/TripInvitation.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { defaultTitle } from '../utils/tripTitle.js';
import { buildPlan } from './plannerService.js';
import * as supabaseTrips from './supabaseTripService.js';

const DESTINATION_SUMMARY_FIELDS = 'name slug state heroImage';
const DESTINATION_DETAIL_FIELDS = `${DESTINATION_SUMMARY_FIELDS} location`;

function toTripSummary(trip) {
  const { id, title, destination, startDate, endDate, days, travelers, budgetTier, status, budget } =
    trip.toJSON();
  return {
    id,
    title,
    destination,
    startDate,
    endDate,
    days,
    travelers,
    budgetTier,
    status,
    budget: { total: budget.total, perPerson: budget.perPerson },
  };
}

// Keep authorization in the service layer for Mongo mode. Supabase mode enforces
// the equivalent access model with RLS policies.
async function findTripWithAccess(userId, tripId, { write = false, ownerOnly = false } = {}) {
  const access = ownerOnly
    ? { _id: tripId, user: userId }
    : write
      ? { _id: tripId, $or: [{ user: userId }, { collaborators: { $elemMatch: { user: userId, role: 'editor' } } }] }
      : { _id: tripId, $or: [{ user: userId }, { 'collaborators.user': userId }] };
  const trip = await Trip.findOne(access).populate(
    'destination',
    DESTINATION_DETAIL_FIELDS,
  );
  if (!trip) throw ApiError.notFound('Trip not found');
  return trip;
}

export async function createTrip(user, input, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.createTrip(user, input, accessToken);
  const { title, origin, tripMode, members, packingList, reservations, ...planInput } = input;
  const plan = await buildPlan(planInput);

  const trip = await Trip.create({
    user: user.id,
    destination: plan.destination.id,
    title: title ?? defaultTitle(plan.days, plan.destination.name),
    origin: origin ?? '',
    tripMode: tripMode ?? 'solo',
    members: members && members.length > 0 ? members : ['Me'],
    startDate: plan.startDate,
    endDate: plan.endDate,
    days: plan.days,
    travelers: planInput.travelers,
    budgetTier: planInput.budgetTier,
    interests: planInput.interests,
    pace: planInput.pace,
    itinerary: plan.itinerary,
    budget: plan.budget,
    packingList: packingList ?? [],
    reservations: reservations ?? [],
  });

  return trip.populate('destination', DESTINATION_DETAIL_FIELDS);
}

export async function duplicateTrip(user, tripId, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.duplicateTrip(user, tripId, accessToken);
  const original = await findTripWithAccess(user.id, tripId);
  const plain = original.toObject();
  delete plain._id;
  delete plain.id;
  delete plain.createdAt;
  delete plain.updatedAt;

  plain.title = `Copy of ${original.title}`.slice(0, 80);
  plain.status = 'planned';
  plain.user = user.id;

  const duplicated = await Trip.create(plain);
  return duplicated.populate('destination', DESTINATION_DETAIL_FIELDS);
}

export async function listTrips(user, { status }, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.listTrips(user, { status }, accessToken);
  const filter = { $or: [{ user: user.id }, { 'collaborators.user': user.id }] };
  if (status) filter.status = status;

  const trips = await Trip.find(filter)
    .sort({ createdAt: -1 })
    .populate('destination', DESTINATION_SUMMARY_FIELDS);
  return trips.map(toTripSummary);
}

export async function getTrip(user, tripId, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.getTrip(user, tripId, accessToken);
  return findTripWithAccess(user.id, tripId);
}

export async function updateTrip(user, tripId, changes, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.updateTrip(user, tripId, changes, accessToken);
  const trip = await findTripWithAccess(user.id, tripId, { write: true });
  trip.set(changes);
  await trip.save();
  return trip;
}

export async function deleteTrip(user, tripId, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.deleteTrip(user, tripId, accessToken);
  const deleted = await Trip.findOneAndDelete({ _id: tripId, user: user.id });
  if (!deleted) throw ApiError.notFound('Trip not found');
  return deleted.id;
}

function invitationView(invitation) {
  const item = invitation.toJSON ? invitation.toJSON() : invitation;
  return {
    id: item.id,
    trip: item.trip?.id ?? item.trip,
    email: item.email,
    role: item.role,
    acceptedAt: item.acceptedAt,
    createdAt: item.createdAt,
  };
}

export async function createInvitation(user, tripId, { email, role }, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.createInvitation(user, tripId, { email, role }, accessToken);
  const trip = await findTripWithAccess(user.id, tripId, { ownerOnly: true });
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === user.email.toLowerCase()) throw ApiError.badRequest('You already own this trip');
  const invitation = await TripInvitation.findOneAndUpdate(
    { trip: trip.id, email: normalizedEmail },
    { $set: { role, invitedBy: user.id, acceptedBy: null, acceptedAt: null } },
    { upsert: true, new: true, runValidators: true },
  );
  return invitationView(invitation);
}

export async function listInvitations(user, tripId, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.listInvitations(user, tripId, accessToken);
  await findTripWithAccess(user.id, tripId, { ownerOnly: true });
  const invitations = await TripInvitation.find({ trip: tripId }).sort({ createdAt: -1 });
  return invitations.map(invitationView);
}

export async function acceptInvitation(user, invitationId, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseTrips.acceptInvitation(user, invitationId, accessToken);
  const invitation = await TripInvitation.findOne({
    _id: invitationId,
    email: user.email.toLowerCase(),
    acceptedAt: null,
  });
  if (!invitation) throw ApiError.notFound('Invitation not found');
  const trip = await Trip.findById(invitation.trip);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (String(trip.user) === String(user.id)) throw ApiError.badRequest('You already own this trip');
  const existing = trip.collaborators.find((collaborator) => String(collaborator.user) === String(user.id));
  if (existing) existing.role = invitation.role;
  else trip.collaborators.push({ user: user.id, role: invitation.role });
  await trip.save();
  invitation.acceptedBy = user.id;
  invitation.acceptedAt = new Date();
  await invitation.save();
  return { invitation: invitationView(invitation), trip: await trip.populate('destination', DESTINATION_DETAIL_FIELDS) };
}
