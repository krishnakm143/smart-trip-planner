import { countDaysInclusive, todayInputValue } from './formatDate'
import { BUDGET_TIERS, LIMITS } from './constants'

/** Mirrors the server's PlanInput rules so most mistakes are caught before a request is made. */
export function validatePlanInput(input) {
  const errors = {}

  if (!input.destinationId) errors.destinationId = 'Choose a destination.'

  if (!input.startDate) {
    errors.startDate = 'Choose a start date.'
  } else if (input.startDate < todayInputValue()) {
    errors.startDate = 'The start date cannot be in the past.'
  }

  if (!input.endDate) {
    errors.endDate = 'Choose an end date.'
  } else if (input.startDate && input.endDate < input.startDate) {
    errors.endDate = 'The end date cannot be before the start date.'
  } else if (input.startDate && countDaysInclusive(input.startDate, input.endDate) > LIMITS.maxDays) {
    errors.endDate = `Trips can be at most ${LIMITS.maxDays} days long.`
  }

  if (
    !Number.isInteger(input.travelers) ||
    input.travelers < LIMITS.minTravelers ||
    input.travelers > LIMITS.maxTravelers
  ) {
    errors.travelers = `Enter between ${LIMITS.minTravelers} and ${LIMITS.maxTravelers} travellers.`
  }

  if (!BUDGET_TIERS.some((tier) => tier.value === input.budgetTier)) {
    errors.budgetTier = 'Choose a budget tier.'
  }

  return errors
}
