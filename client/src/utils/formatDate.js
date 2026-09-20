// Trip dates are calendar dates stored at UTC midnight, so they are always
// formatted in UTC to stop them slipping a day in other time zones.
const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const full = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const weekday = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

export const formatDate = (value) => full.format(new Date(value))

export const formatWeekday = (value) => weekday.format(new Date(value))

export function formatDateRange(start, end) {
  const from = new Date(start)
  const to = new Date(end)
  if (from.getTime() === to.getTime()) return full.format(from)
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear()
  return `${sameYear ? dayMonth.format(from) : full.format(from)} – ${full.format(to)}`
}

export function toDateInputValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const todayInputValue = () => toDateInputValue(new Date())

export function addDays(dateInputValue, count) {
  const [year, month, day] = dateInputValue.split('-').map(Number)
  return toDateInputValue(new Date(year, month - 1, day + count))
}

export function countDaysInclusive(startInputValue, endInputValue) {
  const start = Date.parse(`${startInputValue}T00:00:00Z`)
  const end = Date.parse(`${endInputValue}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.round((end - start) / 86_400_000) + 1
}
