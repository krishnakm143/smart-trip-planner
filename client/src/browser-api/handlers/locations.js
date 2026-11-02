import { haversineKm, roundTo } from '@server/utils/geo.js'
import { allDestinations } from '../catalogue'
import { validateNearestLocation } from '../validate'

// Browser-mode uses the same calculation as the API and keeps the coordinate
// in memory only. It is never written to localStorage.
export function nearest({ query }) {
  const { lat, lng, limit } = validateNearestLocation(query)
  const point = { lat, lng }
  const items = allDestinations()
    .map((destination) => ({
      ...destination,
      distanceKm: roundTo(haversineKm(point, destination.location), 1),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
    .slice(0, limit)
  return { data: { items } }
}
