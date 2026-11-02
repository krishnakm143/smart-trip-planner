import { estimateBudget } from '@server/services/budgetService.js'
import { generateItinerary, sumEntryFees } from '@server/services/itineraryService.js'
import { deriveOptimalTier } from '@server/services/plannerService.js'
import { daysBetweenInclusive, parseDateOnly } from '@server/utils/time.js'
import { activitiesOf, findDestinationById } from './catalogue'
import { routeProvider as defaultRouteProvider } from './providers'

/**
 * Counterpart of buildPlan in server/src/services/plannerService.js. The itinerary
 * and budget come from the server's own modules, so both builds produce the same
 * plan; only the catalogue lookup differs (memory instead of MongoDB).
 */
export async function buildPlan(
  { destinationId, startDate, endDate, travelers, budgetTier, maxBudget, travelToDestinationCost, contingencyPercent, interests, pace },
  routeProvider = defaultRouteProvider,
) {
  const destination = findDestinationById(destinationId)
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  const days = daysBetweenInclusive(start, end)

  const { itinerary, provider } = await generateItinerary({
    activities: activitiesOf(destination.id),
    days,
    pace,
    interests,
    startDate: start,
    routeProvider,
  })

  const resolvedTier =
    budgetTier && budgetTier !== 'auto'
      ? budgetTier
      : deriveOptimalTier(destination.dailyCost, days, travelers, maxBudget, travelToDestinationCost)

  const budget = estimateBudget({
    dailyCost: destination.dailyCost,
    tier: resolvedTier,
    days,
    travelers,
    activityFeesPerPerson: sumEntryFees(itinerary),
  })

  const travel = travelToDestinationCost ?? 0
  const subtotal = budget.total + travel
  const contingency = contingencyPercent === undefined ? 0 : Math.round((subtotal * contingencyPercent) / 100)
  const hasExtras = travelToDestinationCost !== undefined || contingencyPercent !== undefined
  const budgetWithExtras = hasExtras
    ? {
        ...budget,
        breakdown: {
          ...budget.breakdown,
          ...(travelToDestinationCost !== undefined ? { intercityTravel: travel } : {}),
          ...(contingencyPercent !== undefined ? { contingency } : {}),
        },
        total: subtotal + contingency,
        perPerson: Math.round((subtotal + contingency) / travelers),
      }
    : budget
  const budgetWithTarget = maxBudget === undefined
    ? budgetWithExtras
    : { ...budgetWithExtras, target: maxBudget, difference: maxBudget - budgetWithExtras.total, isWithinTarget: budgetWithExtras.total <= maxBudget }

  return { destination, startDate: start, endDate: end, days, itinerary, budget: budgetWithTarget, provider }
}
