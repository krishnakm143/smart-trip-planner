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

  if (!input.budgetTier && !input.maxBudget) {
    errors.budgetTier = 'Choose a budget tier or enter your trip budget.'
  } else if (input.budgetTier && !BUDGET_TIERS.some((tier) => tier.value === input.budgetTier)) {
    errors.budgetTier = 'Choose a valid budget tier.'
  }

  if (input.maxBudget !== '' && input.maxBudget !== undefined && input.maxBudget !== null) {
    if (!Number.isInteger(input.maxBudget) || input.maxBudget < 1 || input.maxBudget > 10_000_000) {
      errors.maxBudget = 'Enter a whole-trip budget from ₹1 to ₹1,00,00,000.'
    }
  }

  if (input.travelToDestinationCost !== '' && input.travelToDestinationCost !== undefined && input.travelToDestinationCost !== null) {
    if (!Number.isInteger(input.travelToDestinationCost) || input.travelToDestinationCost < 0 || input.travelToDestinationCost > 1_000_000) {
      errors.travelToDestinationCost = 'Enter a whole travel cost from ₹0 to ₹10,00,000.'
    }
  }

  if (input.contingencyPercent !== '' && input.contingencyPercent !== undefined && input.contingencyPercent !== null) {
    if (!Number.isInteger(input.contingencyPercent) || input.contingencyPercent < 0 || input.contingencyPercent > 30) {
      errors.contingencyPercent = 'Enter a whole contingency from 0% to 30%.'
    }
  }

  return errors
}
