import { Activity } from '../models/Activity.js';
import { routeProvider } from '../providers/index.js';
import { daysBetweenInclusive, parseDateOnly } from '../utils/time.js';
import { estimateBudget } from './budgetService.js';
import { getDestinationById } from './destinationService.js';
import { generateItinerary, sumEntryFees } from './itineraryService.js';

const toPlannable = (activity) => ({
  id: String(activity._id),
  name: activity.name,
  type: activity.type,
  location: activity.location,
  durationHours: activity.durationHours,
  entryFee: activity.entryFee,
  rating: activity.rating,
  bestTime: activity.bestTime,
});

/**
 * Generates itinerary and budget for a validated PlanInput. Both the public
 * preview and trip creation go through here, so saved numbers are always
 * computed on the server.
 */
export async function buildPlan({
  destinationId,
  startDate,
  endDate,
  travelers,
  budgetTier,
  interests,
  pace,
}) {
  const destination = await getDestinationById(destinationId);
  const activities = await Activity.find({ destination: destination.id }).lean();

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const days = daysBetweenInclusive(start, end);

  const { itinerary, provider } = await generateItinerary({
    activities: activities.map(toPlannable),
    days,
    pace,
    interests,
    startDate: start,
    routeProvider,
  });

  const budget = estimateBudget({
    dailyCost: destination.dailyCost,
    tier: budgetTier,
    days,
    travelers,
    activityFeesPerPerson: sumEntryFees(itinerary),
  });

  return { destination, startDate: start, endDate: end, days, itinerary, budget, provider };
}

export async function estimateDestinationBudget({ destinationId, days, travelers, budgetTier }) {
  const destination = await getDestinationById(destinationId);
  return estimateBudget({ dailyCost: destination.dailyCost, tier: budgetTier, days, travelers });
}
