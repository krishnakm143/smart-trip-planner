import { roundTo } from '../utils/geo.js';
import { addDays, minutesToClock, roundUpTo } from '../utils/time.js';

export const FREE_DAY_NOTE = 'Free day — explore at your own pace';

const HOURS_PER_DAY = { relaxed: 6, balanced: 8, packed: 10 };
const INTEREST_BONUS = 1.5;
const DAY_START = 9 * 60;
const LUNCH_AFTER = 13 * 60;
const LUNCH_MINUTES = 60;
const EVENING_START = 17 * 60;
const SLOT_MINUTES = 5;
const BEST_TIME_ORDER = { morning: 0, afternoon: 1, any: 1, evening: 2 };

const byScoreThenName = (a, b) => b.score - a.score || a.name.localeCompare(b.name);

const slotMinutes = (leg) => roundUpTo(leg.minutes, SLOT_MINUTES);

// Morning stops first, evening stops last; everything else keeps its picked order.
function arrange(stops) {
  return stops
    .map((stop, position) => ({ stop, position }))
    .sort(
      (a, b) =>
        BEST_TIME_ORDER[a.stop.bestTime] - BEST_TIME_ORDER[b.stop.bestTime] ||
        a.position - b.position,
    )
    .map(({ stop }) => stop);
}

function dayLoadHours(stops, matrix) {
  let minutes = 0;
  stops.forEach((stop, i) => {
    minutes += stop.durationHours * 60;
    if (i > 0) minutes += slotMinutes(matrix.leg(stops[i - 1].index, stop.index));
  });
  return minutes / 60;
}

function pickStopsForDay(pool, capacity, matrix) {
  const seed = pool.find((candidate) => candidate.durationHours <= capacity);
  if (!seed) return [];

  const picked = [seed];
  let remaining = pool.filter((candidate) => candidate !== seed);

  while (remaining.length > 0) {
    const last = picked[picked.length - 1];
    const topHalf = remaining.slice(0, Math.ceil(remaining.length / 2));
    const next = topHalf
      .map((candidate) => ({ candidate, km: matrix.leg(last.index, candidate.index).km }))
      .sort((a, b) => a.km - b.km || a.candidate.name.localeCompare(b.candidate.name))
      .map(({ candidate }) => candidate)
      .find((candidate) => dayLoadHours(arrange([...picked, candidate]), matrix) <= capacity);

    if (!next) break;
    picked.push(next);
    remaining = remaining.filter((candidate) => candidate !== next);
  }

  return arrange(picked);
}

function scheduleDay(stops, matrix) {
  let clock = DAY_START;
  let lunchTaken = false;

  return stops.map((stop, i) => {
    const leg = i === 0 ? { km: 0, minutes: 0 } : matrix.leg(stops[i - 1].index, stop.index);
    let start = clock + slotMinutes(leg);

    if (!lunchTaken && start > LUNCH_AFTER) {
      start += LUNCH_MINUTES;
      lunchTaken = true;
    }
    if (stop.bestTime === 'evening') start = Math.max(start, EVENING_START);

    clock = start + stop.durationHours * 60;

    return {
      activity: stop.id,
      name: stop.name,
      type: stop.type,
      location: { lat: stop.location.lat, lng: stop.location.lng },
      startTime: minutesToClock(start),
      endTime: minutesToClock(clock),
      durationHours: stop.durationHours,
      entryFee: stop.entryFee,
      travelKmFromPrev: leg.km,
      travelMinutesFromPrev: leg.minutes,
    };
  });
}

/**
 * Builds a day-wise itinerary. Deterministic for a given input and route matrix:
 * every ordering falls back to the activity name, so input order never matters.
 *
 * @param {object} input
 * @param {Array<{id, name, type, location, durationHours, entryFee, rating, bestTime}>} input.activities
 * @param {number} input.days
 * @param {'relaxed'|'balanced'|'packed'} input.pace
 * @param {string[]} input.interests
 * @param {Date} input.startDate
 * @param {object} input.routeProvider see providers/index.js for the RouteProvider interface
 * @returns {Promise<{ itinerary: object[], provider: string }>}
 */
export async function generateItinerary({
  activities,
  days,
  pace = 'balanced',
  interests = [],
  startDate,
  routeProvider,
}) {
  const matrix = await routeProvider.getMatrix(activities.map((activity) => activity.location));
  const capacity = HOURS_PER_DAY[pace];

  let pool = activities
    .map((activity, index) => ({
      ...activity,
      index,
      score: (activity.rating ?? 0) + (interests.includes(activity.type) ? INTEREST_BONUS : 0),
    }))
    .sort(byScoreThenName);

  const itinerary = [];
  for (let day = 1; day <= days; day += 1) {
    const stops = pickStopsForDay(pool, capacity, matrix);
    pool = pool.filter((candidate) => !stops.includes(candidate));

    const items = scheduleDay(stops, matrix);
    itinerary.push({
      day,
      date: addDays(startDate, day - 1),
      items,
      totalVisitHours: items.reduce((sum, item) => sum + item.durationHours, 0),
      totalTravelKm: roundTo(items.reduce((sum, item) => sum + item.travelKmFromPrev, 0), 1),
      note: items.length === 0 ? FREE_DAY_NOTE : '',
    });
  }

  return { itinerary, provider: matrix.provider };
}

export const sumEntryFees = (itinerary) =>
  itinerary.reduce(
    (total, day) => total + day.items.reduce((sum, item) => sum + item.entryFee, 0),
    0,
  );
