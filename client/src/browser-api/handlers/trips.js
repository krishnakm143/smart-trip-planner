import { ApiError } from '@server/utils/ApiError.js'
import { defaultTitle } from '@server/utils/tripTitle.js'
import { findDestinationById } from '../catalogue'
import { randomId } from '../ids'
import { buildPlan } from '../planner'
import { trips } from '../store'
import { validateNewTrip, validateTripChanges, validateTripFilter } from '../validate'
import { requireUser } from './auth'

function destinationOf(trip, { withLocation = false } = {}) {
  const { id, name, slug, state, heroImage, location } = findDestinationById(trip.destination)
  return withLocation ? { id, name, slug, state, heroImage, location } : { id, name, slug, state, heroImage }
}

const toTrip = (trip) => ({ ...trip, destination: destinationOf(trip, { withLocation: true }) })

const toTripSummary = (trip) => ({
  id: trip.id,
  title: trip.title,
  origin: trip.origin ?? '',
  tripMode: trip.tripMode ?? 'solo',
  destination: destinationOf(trip),
  startDate: trip.startDate,
  endDate: trip.endDate,
  days: trip.days,
  travelers: trip.travelers,
  budgetTier: trip.budgetTier,
  status: trip.status,
  budget: { total: trip.budget.total, perPerson: trip.budget.perPerson },
})

// Scoping every lookup to the owner means another user's trip is simply "not found".
function findOwnedTrip(userId, tripId) {
  const trip = trips.all().find((candidate) => candidate.id === tripId && candidate.user === userId)
  if (!trip) throw ApiError.notFound('Trip not found')
  return trip
}

/** Generates and stores a trip. `routeProvider` is only passed by the first-visit seed. */
export async function saveTrip(userId, { title, origin, tripMode, members, packingList, reservations, ...planInput }, routeProvider) {
  const plan = await buildPlan(planInput, routeProvider)
  const now = new Date().toISOString()

  // Through JSON and back, so dates are stored as the ISO strings the REST API sends.
  return trips.insert(
    JSON.parse(
      JSON.stringify({
        id: randomId(),
        user: userId,
        destination: plan.destination.id,
        title: title ?? defaultTitle(plan.days, plan.destination.name),
        origin: origin ?? '',
        tripMode: tripMode ?? 'solo',
        members: members && members.length > 0 ? members : ['Me'],
        startDate: plan.startDate,
        endDate: plan.endDate,
        days: plan.days,
        travelers: planInput.travelers,
        budgetTier: planInput.budgetTier,
        interests: planInput.interests,
        pace: planInput.pace,
        itinerary: plan.itinerary,
        budget: plan.budget,
        packingList: packingList ?? [],
        reservations: reservations ?? [],
        status: 'planned',
        notes: '',
        createdAt: now,
        updatedAt: now,
      }),
    ),
  )
}

export async function create({ token, body }) {
  const user = requireUser(token)
  const trip = await saveTrip(user.id, validateNewTrip(body))
  return { status: 201, data: { trip: toTrip(trip) } }
}

export function list({ token, query }) {
  const user = requireUser(token)
  const { status } = validateTripFilter(query)

  const items = trips
    .all()
    .filter((trip) => trip.user === user.id && (!status || trip.status === status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toTripSummary)
  return { data: { items } }
}

export function get({ token, params }) {
  const user = requireUser(token)
  return { data: { trip: toTrip(findOwnedTrip(user.id, params.id)) } }
}

export function update({ token, params, body }) {
  const user = requireUser(token)
  const changes = validateTripChanges(body)
  const updated = {
    ...findOwnedTrip(user.id, params.id),
    ...changes,
    updatedAt: new Date().toISOString(),
  }

  trips.replace(trips.all().map((trip) => (trip.id === updated.id ? updated : trip)))
  return { data: { trip: toTrip(updated) } }
}

export function remove({ token, params }) {
  const user = requireUser(token)
  const { id } = findOwnedTrip(user.id, params.id)

  trips.replace(trips.all().filter((trip) => trip.id !== id))
  return { data: { id } }
}

export function duplicate({ token, params }) {
  const user = requireUser(token)
  const original = findOwnedTrip(user.id, params.id)
  const now = new Date().toISOString()
  const duplicated = {
    ...JSON.parse(JSON.stringify(original)),
    id: randomId(),
    user: user.id,
    title: `Copy of ${original.title}`.slice(0, 80),
    status: 'planned',
    createdAt: now,
    updatedAt: now,
  }
  trips.insert(duplicated)
  return { status: 201, data: { trip: toTrip(duplicated) } }
}

export function emailTrip({ token, params, body }) {
  const user = requireUser(token)
  const trip = findOwnedTrip(user.id, params.id)
  const targetEmail = body?.email || user.email
  return {
    data: {
      message: `Trip plan for ${trip.title} sent to ${targetEmail}!`,
      sent: true,
    },
  }
}
