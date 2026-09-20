const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const parseDateOnly = (value) => new Date(`${value}T00:00:00.000Z`);

export const addDays = (date, count) => new Date(date.getTime() + count * MS_PER_DAY);

export const daysBetweenInclusive = (start, end) =>
  Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

// Local calendar date, so "today" matches what the user sees on their clock.
export function todayDateOnly(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isRealDate(value) {
  const date = parseDateOnly(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function minutesToClock(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const roundUpTo = (value, step) => Math.ceil(value / step) * step;
