import { Activity } from '../models/Activity.js';
import { isDbConnected } from '../config/db.js';
import { getCatalogueActivities } from './catalogueService.js';
import { routeProvider } from '../providers/index.js';
import { daysBetweenInclusive, parseDateOnly } from '../utils/time.js';
import { estimateBudget } from './budgetService.js';
import { getDestinationById } from './destinationService.js';
import { generateItinerary, sumEntryFees } from './itineraryService.js';

const toPlannable = (activity) => ({
  id: String(activity._id || activity.id),
  name: activity.name,
  type: activity.type,
  location: activity.location,
  durationHours: activity.durationHours,
  entryFee: activity.entryFee,
  rating: activity.rating,
  bestTime: activity.bestTime,
});

function applyBudgetOptions(budget, { maxBudget, travelToDestinationCost, contingencyPercent, travelers }) {
  const travel = travelToDestinationCost ?? 0;
  const subtotal = budget.total + travel;
  const contingency = contingencyPercent ? Math.round((subtotal * contingencyPercent) / 100) : 0;
  const newTotal = subtotal + contingency;
  const newPerPerson = Math.round(newTotal / travelers);
  const hasExtras = travelToDestinationCost !== undefined || contingencyPercent !== undefined;

  const targetProps =
    maxBudget !== undefined
      ? {
          target: maxBudget,
          targetBudget: maxBudget,
          difference: maxBudget - newTotal,
          remainingBudget: maxBudget - newTotal,
          isWithinTarget: newTotal <= maxBudget,
          isOverBudget: newTotal > maxBudget,
        }
      : {};

  return {
    ...budget,
    total: newTotal,
    perPerson: newPerPerson,
    ...(hasExtras
      ? {
          breakdown: {
            ...budget.breakdown,
            ...(travelToDestinationCost !== undefined ? { intercityTravel: travel } : {}),
            ...(contingencyPercent !== undefined ? { contingency } : {}),
          },
        }
      : {}),
    ...targetProps,
  };
}

export function deriveOptimalTier(dailyCost, days, travelers, maxBudget, travelToDestinationCost = 0) {
  if (!maxBudget || maxBudget <= 0) return 'standard';

  const travel = travelToDestinationCost || 0;
  const tiers = ['luxury', 'standard', 'economy'];

  for (const tier of tiers) {
    const est = estimateBudget({
      dailyCost,
      tier,
      days,
      travelers,
      activityFeesPerPerson: 500,
    });
    const totalWithTravel = est.total + travel;
    if (totalWithTravel <= maxBudget) {
      return tier;
    }
  }

  return 'economy';
}

export async function buildPlan({
  destinationId,
  startDate,
  endDate,
  travelers,
  budgetTier,
  maxBudget,
  travelToDestinationCost,
  contingencyPercent,
  interests,
  pace,
}) {
  const destination = await getDestinationById(destinationId);
  let activities = [];

  if (isDbConnected()) {
    try {
      activities = await Activity.find({ destination: destination.id || destination._id }).lean();
    } catch {
      // Ignore Mongoose errors and fallback to catalogue below
    }
  }

  if (!activities || activities.length === 0) {
    activities = getCatalogueActivities(destination.slug || destination.id);
  }

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

  const resolvedTier =
    budgetTier !== undefined
      ? budgetTier
      : deriveOptimalTier(destination.dailyCost, days, travelers, maxBudget, travelToDestinationCost);

  const budget = estimateBudget({
    dailyCost: destination.dailyCost,
    tier: resolvedTier,
    days,
    travelers,
    activityFeesPerPerson: sumEntryFees(itinerary),
  });

  const budgetWithTarget = applyBudgetOptions(budget, { maxBudget, travelToDestinationCost, contingencyPercent, travelers });

  return { destination, startDate: start, endDate: end, days, itinerary, budget: budgetWithTarget, budgetTier: resolvedTier, provider };
}

export async function estimateDestinationBudget({ destinationId, days, travelers, budgetTier }) {
  const destination = await getDestinationById(destinationId);
  return estimateBudget({
    dailyCost: destination.dailyCost,
    tier: budgetTier,
    days,
    travelers,
    activityFeesPerPerson: 0,
  });
}
