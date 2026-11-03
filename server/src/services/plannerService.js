import { Activity } from '../models/Activity.js';
import { isDbConnected } from '../config/db.js';
import { getCatalogueActivities } from './catalogueService.js';
import { routeProvider } from '../providers/index.js';
import { daysBetweenInclusive, parseDateOnly } from '../utils/time.js';
import {
  assessBudgetFeasibility,
  calculateComparisonScenarios,
  calculateTierActivityEstimate,
  deriveOptimalTier,
  estimateBudget,
} from './budgetService.js';
import { getDestinationById } from './destinationService.js';
import { generateItinerary, sumEntryFees } from './itineraryService.js';

export { deriveOptimalTier };

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

  const plannableActivities = activities.map(toPlannable);
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const days = daysBetweenInclusive(start, end);

  const resolvedTier =
    maxBudget && maxBudget > 0
      ? deriveOptimalTier(destination.dailyCost, days, travelers, maxBudget, travelToDestinationCost, plannableActivities)
      : (budgetTier || 'standard');

  const { itinerary, provider } = await generateItinerary({
    activities: plannableActivities,
    days,
    pace,
    interests,
    startDate: start,
    routeProvider,
    budgetTier: resolvedTier,
  });

  const budget = estimateBudget({
    dailyCost: destination.dailyCost,
    tier: resolvedTier,
    days,
    travelers,
    activityFeesPerPerson: sumEntryFees(itinerary),
  });

  const budgetWithTarget = applyBudgetOptions(budget, { maxBudget, travelToDestinationCost, contingencyPercent, travelers });

  const scenarios = calculateComparisonScenarios({
    dailyCost: destination.dailyCost,
    days,
    travelers,
    maxBudget,
    travelToDestinationCost,
    contingencyPercent,
    activities: plannableActivities,
  });

  const feasibility = assessBudgetFeasibility({
    dailyCost: destination.dailyCost,
    days,
    travelers,
    maxBudget,
    travelToDestinationCost,
    contingencyPercent,
    activities: plannableActivities,
  });

  return {
    destination,
    startDate: start,
    endDate: end,
    days,
    itinerary,
    budget: budgetWithTarget,
    budgetTier: resolvedTier,
    provider,
    scenarios,
    feasibility,
  };
}

export async function estimateDestinationBudget({
  destinationId,
  days,
  travelers,
  budgetTier = 'standard',
  maxBudget,
  travelToDestinationCost = 0,
  contingencyPercent = 0,
}) {
  const destination = await getDestinationById(destinationId);
  let activities = [];

  if (isDbConnected()) {
    try {
      activities = await Activity.find({ destination: destination.id || destination._id }).lean();
    } catch {
      // ignore
    }
  }

  if (!activities || activities.length === 0) {
    activities = getCatalogueActivities(destination.slug || destination.id);
  }

  const plannable = activities.map(toPlannable);
  const resolvedTier =
    maxBudget && maxBudget > 0
      ? deriveOptimalTier(destination.dailyCost, days, travelers, maxBudget, travelToDestinationCost, plannable)
      : (budgetTier || 'standard');

  const scenarios = calculateComparisonScenarios({
    dailyCost: destination.dailyCost,
    days,
    travelers,
    maxBudget,
    travelToDestinationCost,
    contingencyPercent,
    activities: plannable,
  });

  const feasibility = assessBudgetFeasibility({
    dailyCost: destination.dailyCost,
    days,
    travelers,
    maxBudget,
    travelToDestinationCost,
    contingencyPercent,
    activities: plannable,
  });

  const activityFeesPerPerson = maxBudget ? calculateTierActivityEstimate(plannable, resolvedTier, days) : 0;
  const baseBudget = estimateBudget({
    dailyCost: destination.dailyCost,
    tier: resolvedTier,
    days,
    travelers,
    activityFeesPerPerson,
  });

  const hasExtras = maxBudget !== undefined || travelToDestinationCost || contingencyPercent;
  const budget = hasExtras
    ? applyBudgetOptions(baseBudget, {
        maxBudget,
        travelToDestinationCost,
        contingencyPercent,
        travelers,
      })
    : baseBudget;

  return {
    budget,
    scenarios,
    feasibility,
    budgetTier: resolvedTier,
  };
}
