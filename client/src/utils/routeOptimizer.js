/**
 * Geographic route optimization utilities for itinerary stops.
 * Implements Nearest Neighbor TSP heuristic to minimize total transit distance.
 */

const EARTH_RADIUS_KM = 6371

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

export function haversineDistanceKm(from, to) {
  if (!from || !to) return 0
  const lat1 = from.lat ?? from.latitude
  const lng1 = from.lng ?? from.longitude
  const lat2 = to.lat ?? to.latitude
  const lng2 = to.lng ?? to.longitude

  if (typeof lat1 !== 'number' || typeof lng1 !== 'number' || typeof lat2 !== 'number' || typeof lng2 !== 'number') {
    return 0
  }

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

function calculateEndTime(startTime, durationHours) {
  const [h, m] = (startTime || '10:00').split(':').map(Number)
  const totalMins = h * 60 + m + Math.round((durationHours || 1) * 60)
  const endH = Math.floor(totalMins / 60) % 24
  const endM = totalMins % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

function addMinutesToTime(timeStr, minutesToAdd) {
  const [h, m] = (timeStr || '10:00').split(':').map(Number)
  const totalMins = h * 60 + m + Math.round(minutesToAdd)
  const endH = Math.floor(totalMins / 60) % 24
  const endM = totalMins % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

/**
 * Optimizes an array of itinerary items using Nearest Neighbor TSP heuristic.
 * Keeps the first item fixed (starting point for the day) and greedily visits the closest unvisited stop.
 * Recalculates start and end times sequentially based on estimated transit times.
 *
 * @param {Array} items - List of stops for a single day
 * @returns {Array} - Reordered items with updated travelKmFromPrev, travelMinutesFromPrev, startTime, endTime
 */
export function optimizeDayRoute(items) {
  if (!Array.isArray(items) || items.length <= 2) return items

  // Check how many items have valid geographic coordinates
  const itemsWithCoords = items.map((item, index) => ({
    originalIndex: index,
    item,
    coord: item.location?.lat ? item.location : item.lat ? { lat: item.lat, lng: item.lng } : null,
  }))

  const validCount = itemsWithCoords.filter((x) => x.coord !== null).length
  if (validCount < 2) {
    // Not enough coordinates to perform meaningful TSP
    return items
  }

  // Preserve starting time from first item
  const dayStartTime = items[0].startTime || '09:30'

  // Nearest neighbor greedy traversal
  const visited = new Set()
  const ordered = []

  // Start with the first item (base departure for the morning)
  let current = itemsWithCoords[0]
  visited.add(current.originalIndex)
  ordered.push(current.item)

  while (visited.size < items.length) {
    let nearest = null
    let minDistance = Infinity

    for (let i = 0; i < itemsWithCoords.length; i++) {
      if (visited.has(i)) continue
      const candidate = itemsWithCoords[i]

      // If either lacks coordinates, distance defaults to an arbitrary standard
      const distance =
        current.coord && candidate.coord
          ? haversineDistanceKm(current.coord, candidate.coord)
          : 5.0 // fallback 5 km

      if (distance < minDistance) {
        minDistance = distance
        nearest = candidate
      }
    }

    if (nearest) {
      visited.add(nearest.originalIndex)
      ordered.push(nearest.item)
      current = nearest
    } else {
      break
    }
  }

  // Recalculate schedule times and travel distances between successive stops
  let cursorTime = dayStartTime
  return ordered.map((item, index) => {
    if (index === 0) {
      const duration = item.durationHours || 1.5
      return {
        ...item,
        startTime: cursorTime,
        endTime: calculateEndTime(cursorTime, duration),
        travelKmFromPrev: 0,
        travelMinutesFromPrev: 0,
      }
    }

    const prevItem = ordered[index - 1]
    const prevCoord = prevItem.location?.lat ? prevItem.location : prevItem.lat ? { lat: prevItem.lat, lng: prevItem.lng } : null
    const currentCoord = item.location?.lat ? item.location : item.lat ? { lat: item.lat, lng: item.lng } : null

    const distKm = prevCoord && currentCoord ? Math.round(haversineDistanceKm(prevCoord, currentCoord) * 10) / 10 : 3.0
    // Estimate urban transit speed at ~25 km/h + 5 min buffer
    const transitMins = Math.max(10, Math.round((distKm / 25) * 60) + 5)

    // Schedule start after previous activity end + transit
    const prevEndTime = calculateEndTime(cursorTime, prevItem.durationHours || 1.5)
    const newStartTime = addMinutesToTime(prevEndTime, transitMins)
    cursorTime = newStartTime

    const duration = item.durationHours || 1.5
    const newEndTime = calculateEndTime(newStartTime, duration)

    return {
      ...item,
      startTime: newStartTime,
      endTime: newEndTime,
      travelKmFromPrev: distKm,
      travelMinutesFromPrev: transitMins,
    }
  })
}
