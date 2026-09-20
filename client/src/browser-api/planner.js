import { estimateBudget } from '@server/services/budgetService.js'
import { generateItinerary, sumEntryFees } from '@server/services/itineraryService.js'
import { daysBetweenInclusive, parseDateOnly } from '@server/utils/time.js'
import { activitiesOf, findDestinationById } from './catalogue'
import { routeProvider as defaultRouteProvider } from './providers'

/**
 * Counterpart of buildPlan in server/src/services/plannerService.js. The itinerary
 * and budget come from the server's own modules, so both builds produce the same
 * plan; only the catalogue lookup differs (memory instead of MongoDB).
 */
export async function buildPlan(
  { destinationId, startDate, endDate, travelers, budgetTier, interests, pace },
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

  const budget = estimateBudget({
    dailyCost: destination.dailyCost,
    tier: budgetTier,
    days,
    travelers,
    activityFeesPerPerson: sumEntryFees(itinerary),
  })

  return { destination, startDate: start, endDate: end, days, itinerary, budget, provider }
}
