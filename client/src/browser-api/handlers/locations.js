import { haversineKm, roundTo } from '@server/utils/geo.js'
import { allDestinations } from '../catalogue'
import { validateNearestLocation } from '../validate'

// Browser-mode uses realistic highway road conversion and keeps the coordinate
// in memory only. It is never written to localStorage.
export function nearest({ query }) {
  const { lat, lng, limit } = validateNearestLocation(query)
  const point = { lat, lng }
  const items = allDestinations()
    .map((destination) => {
      const airKm = haversineKm(point, destination.location)
      // Realistic road distance conversion: for identical coordinates (<0.05km) keep 0,
      // otherwise apply highway road factor ~1.38x.
      const roadKm = airKm < 0.05 ? 0 : roundTo(airKm * 1.38, 1)
      const drivingMinutes = Math.max(1, Math.round((roadKm / 55) * 60))
      return {
        ...destination,
        distanceKm: roadKm,
        drivingMinutes,
        distanceType: 'road',
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
    .slice(0, limit)
  return { data: { items } }
}
