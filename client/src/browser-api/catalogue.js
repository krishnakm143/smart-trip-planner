import { activitiesBySlug } from '@server/seed/activities.js'
import { destinations as seedDestinations } from '@server/seed/destinations.js'
import { ApiError } from '@server/utils/ApiError.js'
import { stableId } from './ids'

// The same records `npm run seed` writes to MongoDB, held in memory.
const destinations = seedDestinations.map((destination) => ({
  id: stableId(`destination:${destination.slug}`),
  ...destination,
}))

const activities = destinations.flatMap((destination) =>
  activitiesBySlug[destination.slug].map((activity) => ({
    id: stableId(`activity:${destination.slug}:${activity.name}`),
    destination: destination.id,
    ...activity,
    source: 'seed',
  })),
)

const byRatingThenName = (a, b) => b.rating - a.rating || a.name.localeCompare(b.name)

export const allDestinations = () => [...destinations].sort(byRatingThenName)

export const activitiesOf = (destinationId) =>
  activities.filter((activity) => activity.destination === destinationId).sort(byRatingThenName)

function findDestination(predicate) {
  const destination = destinations.find(predicate)
  if (!destination) throw ApiError.notFound('Destination not found')
  return destination
}

export const findDestinationById = (id) => findDestination((destination) => destination.id === id)

export const findDestinationBySlug = (slug) =>
  findDestination((destination) => destination.slug === slug)
