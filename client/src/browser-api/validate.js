import {
  ACTIVITY_TYPES,
  BUDGET_TIERS,
  DESTINATION_CATEGORIES,
  PACES,
  TRIP_STATUSES,
} from '@server/models/constants.js'
import { ApiError } from '@server/utils/ApiError.js'
import {
  daysBetweenInclusive,
  isRealDate,
  parseDateOnly,
  todayDateOnly,
} from '@server/utils/time.js'

// Same rules and messages as server/src/validators. Those are zod schemas tied
// to mongoose, so the checks are written out here.

const MAX_TRIP_DAYS = 14
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
  check.require(EMAIL.test(email), 'email', 'Enter a valid email address')
  check.require(password.length >= 8, 'password', 'Password must be at least 8 characters')
  check.require(password.length <= 72, 'password', 'Password must be at most 72 characters')
  check.done()

  return { name, email, password }
}

export function validateLogin(body) {
  const email = text(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  const check = checker()
  check.require(EMAIL.test(email), 'email', 'Enter a valid email address')
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
  const { destinationId, startDate, endDate, travelers, budgetTier, pace = 'balanced' } = body
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
  check.require(BUDGET_TIERS.includes(budgetTier), 'budgetTier', oneOf(BUDGET_TIERS))
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

  return { destinationId, startDate, endDate, travelers, budgetTier, interests, pace }
}

function checkTitle(check, title) {
  check.require(title.length >= 1, 'title', 'Title cannot be empty')
  check.require(title.length <= 80, 'title', 'Title can be at most 80 characters')
}

export function validateNewTrip(body) {
  const plan = validatePlanInput(body)
  if (body.title === undefined) return plan

  const title = text(body.title)
  const check = checker()
  checkTitle(check, title)
  check.done()
  return { ...plan, title }
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
  check.require(Object.keys(changes).length > 0, '', 'Provide at least one of title, notes or status')
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
