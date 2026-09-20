const MIN_BREAK_MINUTES = 45
const LONG_BREAK_MINUTES = 120

export function toMinutes(clock) {
  const [hours, minutes] = clock.split(':').map(Number)
  return hours * 60 + minutes
}

export function formatClock(clock) {
  const [hours, minutes] = clock.split(':').map(Number)
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function formatDuration(hours) {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

export const formatKm = (km) => `${Number(km).toFixed(1)} km`

/**
 * The API schedules a lunch hour (and holds evening stops back until later in
 * the day) without returning either as an item. Both show up as idle time
 * between two stops that the travel leg cannot account for. The first such gap
 * of a day is lunch; any later one is free time.
 */
export function describeBreaks(items) {
  let lunchTaken = false

  return items.map((item, index) => {
    const previous = items[index - 1]
    if (!previous) return null

    const idle = toMinutes(item.startTime) - toMinutes(previous.endTime) - item.travelMinutesFromPrev
    if (idle < MIN_BREAK_MINUTES) return null

    const leaveAt = toMinutes(item.startTime) - item.travelMinutesFromPrev
    const until = formatClock(`${Math.floor(leaveAt / 60)}:${leaveAt % 60}`)
    if (lunchTaken) return { kind: 'free', label: `Free time until ${until}` }

    lunchTaken = true
    return {
      kind: 'lunch',
      label: idle >= LONG_BREAK_MINUTES ? `Lunch and free time until ${until}` : 'Lunch, about an hour',
    }
  })
}
