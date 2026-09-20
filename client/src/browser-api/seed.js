import { SAMPLE_PASSWORD, sampleTrips, sampleUsers } from '@server/seed/sampleData.js'
import { findDestinationBySlug } from './catalogue'
import { createUser } from './handlers/auth'
import { saveTrip } from './handlers/trips'
import { localRouteProvider } from './providers'
import { seededFlag } from './store'

const dateInDays = (count) => {
  const date = new Date()
  date.setDate(date.getDate() + count)
  return date.toLocaleDateString('en-CA')
}

// First visit: the accounts and saved trips that `npm run seed` creates for the
// REST API, so the demo login opens onto the same trips. Distances come from the
// local provider to keep the first page load off the network.
async function seed() {
  for (const { name, email } of sampleUsers) {
    const user = await createUser({ name, email, password: SAMPLE_PASSWORD })
    const ownTrips = sampleTrips.filter((trip) => trip.email === email)

    for (const { slug, startInDays, days, travelers, budgetTier, interests, pace } of ownTrips) {
      await saveTrip(
        user.id,
        {
          travelers,
          budgetTier,
          interests,
          pace,
          destinationId: findDestinationBySlug(slug).id,
          startDate: dateInDays(startInDays),
          endDate: dateInDays(startInDays + days - 1),
        },
        localRouteProvider,
      )
    }
  }
  seededFlag.set()
}

let seeding

/** Resolves once this browser holds the sample data. */
export function ready() {
  if (seededFlag.isSet()) return Promise.resolve()
  seeding ??= seed()
  return seeding
}
