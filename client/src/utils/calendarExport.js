/**
 * Generates and downloads a standard RFC 5545 iCalendar (.ics) file
 * containing all days and scheduled activities for a trip.
 */

function formatIcsDateTime(dateStr, timeStr) {
  // dateStr is 'YYYY-MM-DD' or ISO timestamp, timeStr is 'HH:MM'
  const dateClean = String(dateStr || '').slice(0, 10).replace(/-/g, '')
  const timeClean = timeStr ? String(timeStr).slice(0, 5).replace(/:/g, '') + '00' : '090000'
  return `${dateClean}T${timeClean}`
}

function escapeIcsText(text) {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function exportTripToIcs(trip) {
  if (!trip?.itinerary || trip.itinerary.length === 0) return

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const destinationName = trip.destination?.name || trip.title || 'Travel Destination'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Trip Planner//Intelligent Travel Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(trip.title || destinationName)}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ]

  trip.itinerary.forEach((day) => {
    const dayDate = day.date || trip.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)

    day.items?.forEach((item, idx) => {
      const uid = `stp-${trip.id}-d${day.day}-i${idx}-${Date.now()}@smarttripplanner`
      const dtStart = formatIcsDateTime(dayDate, item.startTime || '09:00')
      const dtEnd = formatIcsDateTime(dayDate, item.endTime || '11:00')
      const summary = `${item.name} (${destinationName})`
      const description = `${item.description || ''}\\n\\nType: ${item.type || 'Sightseeing'}\\nEstimated Fee: ${item.entryFee ? '₹' + item.entryFee : 'Free'}`
      const location = `${item.name}, ${destinationName}`

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${escapeIcsText(location)}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      )
    })
  })

  lines.push('END:VCALENDAR')

  const icsBlob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const downloadUrl = URL.createObjectURL(icsBlob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', `${(trip.title || 'trip-itinerary').toLowerCase().replace(/\s+/g, '-')}.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
}
