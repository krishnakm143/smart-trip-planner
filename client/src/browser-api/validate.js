import {
  ACTIVITY_TYPES,
  BUDGET_TIERS,
  DESTINATION_CATEGORIES,
  PACES,
  TRIP_STATUSES,
} from '@server/models/constants.js'
import { ApiError } from '@server/utils/ApiError.js'
import { validateEmailSecurity } from '@server/utils/emailValidator.js'
import {
  daysBetweenInclusive,
  isRealDate,
  parseDateOnly,
  todayDateOnly,
} from '@server/utils/time.js'

// Same rules and messages as server/src/validators. Those are zod schemas tied
// to mongoose, so the checks are written out here.

const MAX_TRIP_DAYS = 14
const OBJECT_ID = /^[a-f0-9]{24}$/
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const oneOf = (values) => `Choose one of: ${values.join(', ')}`

/** Collects `{ path, message }` issues and throws them as one VALIDATION_ERROR. */
function checker() {
  const details = []
  return {
    require: (condition, path, message) => condition || details.push({ path, message }),
    done() {
      if (details.length > 0) throw ApiError.validation('Request validation failed', details)
    },
  }
}

const text = (value) => (typeof value === 'string' ? value.trim() : '')

export function validateRegistration(body) {
  const name = text(body.name)
  const email = text(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  const check = checker()
  check.require(name.length >= 2, 'name', 'Name must be at least 2 characters')
  check.require(name.length <= 60, 'name', 'Name must be at most 60 characters')
  const emailRes = validateEmailSecurity(email)
  check.require(emailRes.valid, 'email', emailRes.message || 'Enter a valid email address')
  check.require(password.length >= 8, 'password', 'Password must be at least 8 characters')
  check.require(password.trim().length >= 8, 'password', 'Password cannot consist only of whitespace')
  check.require(password.length <= 72, 'password', 'Password must be at most 72 characters')
  check.done()

  return { name, email, password }
}

export function validateLogin(body) {
  const email = text(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  const check = checker()
  const emailRes = validateEmailSecurity(email)
  check.require(emailRes.valid, 'email', emailRes.message || 'Enter a valid email address')
  check.require(password.length >= 1, 'password', 'Password is required')
  check.done()

  return { email, password }
}

function checkDate(check, value, path) {
  const wellFormed = typeof value === 'string' && DATE_ONLY.test(value)
  check.require(wellFormed, path, 'Use the format YYYY-MM-DD')
  if (wellFormed) check.require(isRealDate(value), path, 'Must be a real calendar date')
}

export function validatePlanInput(body) {
  const { destinationId, startDate, endDate, travelers, budgetTier, maxBudget, travelToDestinationCost, contingencyPercent, pace = 'balanced', origin = '', tripMode = 'couple', members = [] } = body
  const interests = [...new Set(body.interests ?? [])]

  const check = checker()
  check.require(OBJECT_ID.test(destinationId ?? ''), 'destinationId', 'Must be a valid id')
  checkDate(check, startDate, 'startDate')
  checkDate(check, endDate, 'endDate')
  check.require(Number.isInteger(travelers), 'travelers', 'Must be a whole number')
  if (Number.isInteger(travelers)) {
    check.require(travelers >= 1, 'travelers', 'At least 1 traveller')
    check.require(travelers <= 12, 'travelers', 'At most 12 travellers')
  }
  if (budgetTier !== undefined) {
    check.require(BUDGET_TIERS.includes(budgetTier), 'budgetTier', oneOf(BUDGET_TIERS))
  } else if (maxBudget === undefined) {
    check.require(false, 'budgetTier', 'Choose a budget tier or enter your trip budget')
  }
  if (maxBudget !== undefined) {
    check.require(Number.isInteger(maxBudget), 'maxBudget', 'Budget must be a whole number')
    if (Number.isInteger(maxBudget)) {
      check.require(maxBudget >= 1, 'maxBudget', 'Budget must be at least ₹1')
      check.require(maxBudget <= 10_000_000, 'maxBudget', 'Budget cannot exceed ₹1,00,00,000')
    }
  }
  if (travelToDestinationCost !== undefined) {
    check.require(Number.isInteger(travelToDestinationCost), 'travelToDestinationCost', 'Travel cost must be a whole number')
    if (Number.isInteger(travelToDestinationCost)) {
      check.require(travelToDestinationCost >= 0, 'travelToDestinationCost', 'Travel cost cannot be negative')
      check.require(travelToDestinationCost <= 1_000_000, 'travelToDestinationCost', 'Travel cost cannot exceed ₹10,00,000')
    }
  }
  if (contingencyPercent !== undefined) {
    check.require(Number.isInteger(contingencyPercent), 'contingencyPercent', 'Contingency must be a whole percentage')
    if (Number.isInteger(contingencyPercent)) {
      check.require(contingencyPercent >= 0 && contingencyPercent <= 30, 'contingencyPercent', 'Contingency must be from 0% to 30%')
    }
  }
  check.require(PACES.includes(pace), 'pace', oneOf(PACES))
  interests.forEach((interest, i) =>
    check.require(ACTIVITY_TYPES.includes(interest), `interests.${i}`, oneOf(ACTIVITY_TYPES)),
  )
  check.done()

  // ISO date strings compare correctly as plain strings.
  check.require(startDate >= todayDateOnly(), 'startDate', 'Start date cannot be in the past')
  if (endDate < startDate) {
    check.require(false, 'endDate', 'End date must be on or after the start date')
  } else {
    const days = daysBetweenInclusive(parseDateOnly(startDate), parseDateOnly(endDate))
    check.require(days <= MAX_TRIP_DAYS, 'endDate', `A trip can be at most ${MAX_TRIP_DAYS} days long`)
  }
  check.done()

  return { destinationId, startDate, endDate, travelers, budgetTier, maxBudget, travelToDestinationCost, contingencyPercent, interests, pace, origin: typeof origin === 'string' ? origin.trim() : '', tripMode, members: Array.isArray(members) ? members : [] }
}

function checkTitle(check, title) {
  check.require(title.length >= 1, 'title', 'Title cannot be empty')
  check.require(title.length <= 80, 'title', 'Title can be at most 80 characters')
}

export function validateNewTrip(body) {
  const plan = validatePlanInput(body)
  const result = {
    ...plan,
    packingList: Array.isArray(body.packingList) ? body.packingList : [],
    reservations: Array.isArray(body.reservations) ? body.reservations : [],
  }
  if (body.title === undefined) return result

  const title = text(body.title)
  const check = checker()
  checkTitle(check, title)
  check.done()
  return { ...result, title }
}

export function validateTripChanges(body) {
  const changes = {}
  const check = checker()

  if (body.title !== undefined) {
    changes.title = text(body.title)
    checkTitle(check, changes.title)
  }
  if (body.notes !== undefined) {
    changes.notes = text(body.notes)
    check.require(changes.notes.length <= 1000, 'notes', 'Notes can be at most 1000 characters')
  }
  if (body.status !== undefined) {
    changes.status = body.status
    check.require(TRIP_STATUSES.includes(body.status), 'status', oneOf(TRIP_STATUSES))
  }
  if (body.origin !== undefined) {
    changes.origin = text(body.origin)
  }
  if (body.tripMode !== undefined) {
    changes.tripMode = body.tripMode
  }
  if (body.members !== undefined) {
    changes.members = Array.isArray(body.members) ? body.members : []
  }
  if (body.itinerary !== undefined) {
    changes.itinerary = body.itinerary
  }
  if (body.budget !== undefined) {
    changes.budget = body.budget
  }
  if (body.packingList !== undefined) {
    changes.packingList = body.packingList
  }
  if (body.reservations !== undefined) {
    changes.reservations = body.reservations
  }
  check.require(Object.keys(changes).length > 0, '', 'Provide at least one trip field to update')
  check.done()

  return changes
}

export function validateTripFilter(query) {
  const check = checker()
  if (query.status !== undefined) {
    check.require(TRIP_STATUSES.includes(query.status), 'status', oneOf(TRIP_STATUSES))
  }
  check.done()
  return { status: query.status }
}

const EXPENSE_CATEGORIES = ['stay', 'food', 'transport', 'activities', 'shopping', 'other']

export function validateExpense(body, { partial = false } = {}) {
  const output = {}
  const check = checker()
  if (!partial || body.title !== undefined) {
    output.title = text(body.title)
    check.require(output.title.length >= 1 && output.title.length <= 80, 'title', 'Title must be 1 to 80 characters')
  }
  if (!partial || body.amount !== undefined) {
    output.amount = body.amount
    check.require(Number.isInteger(output.amount) && output.amount >= 1 && output.amount <= 10000000, 'amount', 'Amount must be a whole number from ₹1 to ₹1,00,00,000')
  }
  if (!partial || body.category !== undefined) {
    output.category = body.category
    check.require(EXPENSE_CATEGORIES.includes(output.category), 'category', oneOf(EXPENSE_CATEGORIES))
  }
  if (!partial || body.spentOn !== undefined) {
    output.spentOn = body.spentOn
    checkDate(check, output.spentOn, 'spentOn')
  }
  if (body.paymentMethod !== undefined) {
    output.paymentMethod = body.paymentMethod
  }
  if (body.paidBy !== undefined) {
    output.paidBy = text(body.paidBy) || 'Me'
  }
  if (body.splitType !== undefined) {
    output.splitType = body.splitType
  }
  if (body.splits !== undefined) {
    output.splits = Array.isArray(body.splits) ? body.splits : []
  }
  if (body.currency !== undefined) {
    output.currency = text(body.currency) || 'INR'
  }
  if (body.exchangeRate !== undefined) {
    output.exchangeRate = Number(body.exchangeRate) || 1
  }
  if (body.notes !== undefined) {
    output.notes = text(body.notes)
    check.require(output.notes.length <= 300, 'notes', 'Notes can be at most 300 characters')
  }
  check.require(!partial || Object.keys(output).length > 0, '', 'Provide at least one expense field')
  check.done()
  return output
}

export function validateDestinationQuery(query) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 12)

  const check = checker()
  check.require(Number.isInteger(page) && page >= 1, 'page', 'Must be a whole number from 1')
  check.require(Number.isInteger(limit) && limit >= 1, 'limit', 'Must be a whole number from 1')
  if (query.category !== undefined) {
    check.require(
      DESTINATION_CATEGORIES.includes(query.category),
      'category',
      oneOf(DESTINATION_CATEGORIES),
    )
  }
  check.done()

  return { search: text(query.search), category: query.category, page, limit: Math.min(limit, 50) }
}

export function validatePlaceType(query) {
  const check = checker()
  if (query.type !== undefined) {
    check.require(ACTIVITY_TYPES.includes(query.type), 'type', oneOf(ACTIVITY_TYPES))
  }
  check.done()
  return query.type
}

export function validateNearestLocation(query) {
  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const limit = query.limit === undefined ? 6 : Number(query.limit)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw ApiError.validation('Request validation failed', [{ path: 'lat', message: 'Must be a latitude between -90 and 90' }])
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw ApiError.validation('Request validation failed', [{ path: 'lng', message: 'Must be a longitude between -180 and 180' }])
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw ApiError.validation('Request validation failed', [{ path: 'limit', message: 'Must be between 1 and 12' }])
  return { lat, lng, limit }
}
