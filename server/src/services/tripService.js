import { Trip } from '../models/Trip.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPlan } from './plannerService.js';

const DESTINATION_SUMMARY_FIELDS = 'name slug state heroImage';
const DESTINATION_DETAIL_FIELDS = `${DESTINATION_SUMMARY_FIELDS} location`;

const defaultTitle = (days, destinationName) =>
  `${days} ${days === 1 ? 'day' : 'days'} in ${destinationName}`;

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

// Scoping every lookup to the owner means another user's trip is simply "not found".
async function findOwnedTrip(userId, tripId) {
  const trip = await Trip.findOne({ _id: tripId, user: userId }).populate(
    'destination',
    DESTINATION_DETAIL_FIELDS,
  );
  if (!trip) throw ApiError.notFound('Trip not found');
  return trip;
}

export async function createTrip(userId, { title, ...planInput }) {
  const plan = await buildPlan(planInput);

  const trip = await Trip.create({
    user: userId,
    destination: plan.destination.id,
    title: title ?? defaultTitle(plan.days, plan.destination.name),
    startDate: plan.startDate,
    endDate: plan.endDate,
    days: plan.days,
    travelers: planInput.travelers,
    budgetTier: planInput.budgetTier,
    interests: planInput.interests,
    pace: planInput.pace,
    itinerary: plan.itinerary,
    budget: plan.budget,
  });

  return trip.populate('destination', DESTINATION_DETAIL_FIELDS);
}

export async function listTrips(userId, { status }) {
  const filter = { user: userId };
  if (status) filter.status = status;

  const trips = await Trip.find(filter)
    .sort({ createdAt: -1 })
    .populate('destination', DESTINATION_SUMMARY_FIELDS);
  return trips.map(toTripSummary);
}

export const getTrip = findOwnedTrip;

export async function updateTrip(userId, tripId, changes) {
  const trip = await findOwnedTrip(userId, tripId);
  trip.set(changes);
  await trip.save();
  return trip;
}

export async function deleteTrip(userId, tripId) {
  const deleted = await Trip.findOneAndDelete({ _id: tripId, user: userId });
  if (!deleted) throw ApiError.notFound('Trip not found');
  return deleted.id;
}
