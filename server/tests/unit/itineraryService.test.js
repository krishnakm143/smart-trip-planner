import { describe, expect, it } from 'vitest';
import { localRouteProvider } from '../../src/providers/local/routeProvider.js';
import { FREE_DAY_NOTE, generateItinerary, sumEntryFees } from '../../src/services/itineraryService.js';
import { parseDateOnly } from '../../src/utils/time.js';
import { manaliActivities } from '../helpers/fixtures.js';

const activities = manaliActivities.map((activity, index) => ({ ...activity, id: `a${index}` }));
const HOURS_PER_DAY = { relaxed: 6, balanced: 8, packed: 10 };

const generate = (overrides = {}) =>
  generateItinerary({
    activities,
    days: 3,
    pace: 'balanced',
    interests: [],
    startDate: parseDateOnly('2030-05-01'),
    routeProvider: localRouteProvider,
    ...overrides,
  });

const toMinutes = (clock) => {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

const namesOf = (itinerary) => itinerary.flatMap((day) => day.items.map((item) => item.name));

describe('generateItinerary', () => {
  it('returns one entry per day with consecutive dates', async () => {
    const { itinerary, provider } = await generate();

    expect(provider).toBe('local');
    expect(itinerary.map((day) => day.day)).toEqual([1, 2, 3]);
    expect(itinerary.map((day) => day.date.toISOString().slice(0, 10))).toEqual([
      '2030-05-01',
      '2030-05-02',
      '2030-05-03',
    ]);
  });

  it('is deterministic for the same input', async () => {
    const first = await generate({ interests: ['adventure'] });
    const second = await generate({ interests: ['adventure'] });
    expect(second).toEqual(first);
  });

  it('does not depend on the order of the input activities', async () => {
    const forward = await generate();
    const reversed = await generate({ activities: [...activities].reverse() });
    expect(reversed.itinerary).toEqual(forward.itinerary);
  });

  it.each(Object.entries(HOURS_PER_DAY))(
    'keeps visit plus travel time within %s capacity',
    async (pace, capacity) => {
      const { itinerary } = await generate({ pace, days: 5 });

      for (const day of itinerary) {
        const travelHours =
          day.items.reduce((sum, item) => sum + item.travelMinutesFromPrev, 0) / 60;
        expect(day.totalVisitHours + travelHours).toBeLessThanOrEqual(capacity);
      }
    },
  );

  it('never schedules an activity twice', async () => {
    const names = namesOf((await generate({ days: 6 })).itinerary);
    expect(new Set(names).size).toBe(names.length);
  });

  it('lets interests change which activities are selected', async () => {
    const shopping = await generate({ days: 1, interests: ['shopping', 'food'] });
    const adventure = await generate({ days: 1, interests: ['adventure'] });

    expect(namesOf(shopping.itinerary)).not.toEqual(namesOf(adventure.itinerary));
    expect(namesOf(adventure.itinerary)[0]).toBe('Rohtang Pass');
    expect(namesOf(shopping.itinerary)).toContain('Mall Road Manali');
  });

  it('places morning items first and evening items last in a day', async () => {
    const { itinerary } = await generate({ days: 5 });
    const order = { morning: 0, any: 1, afternoon: 1, evening: 2 };
    const bestTimeByName = Object.fromEntries(activities.map((a) => [a.name, a.bestTime]));

    for (const day of itinerary) {
      const ranks = day.items.map((item) => order[bestTimeByName[item.name]]);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }

    const eveningDay = itinerary.find((day) =>
      day.items.some((item) => bestTimeByName[item.name] === 'evening'),
    );
    expect(bestTimeByName[eveningDay.items.at(-1).name]).toBe('evening');
  });

  it('schedules from 09:00 with ascending, non-overlapping times', async () => {
    const { itinerary } = await generate();

    for (const day of itinerary.filter((entry) => entry.items.length > 0)) {
      expect(day.items[0].startTime).toBe('09:00');
      expect(day.items[0].travelKmFromPrev).toBe(0);

      day.items.forEach((item, index) => {
        expect(toMinutes(item.endTime) - toMinutes(item.startTime)).toBe(item.durationHours * 60);
        expect(toMinutes(item.startTime) % 5).toBe(0);
        if (index > 0) {
          const previous = day.items[index - 1];
          expect(toMinutes(item.startTime)).toBeGreaterThanOrEqual(
            toMinutes(previous.endTime) + item.travelMinutesFromPrev,
          );
        }
      });
    }
  });

  it('leaves a 60-minute lunch gap before the first item starting after 13:00', async () => {
    const lunchActivities = [
      { ...activities[0], id: 'x1', name: 'A Morning Walk', durationHours: 4.5, rating: 5, bestTime: 'morning' },
      { ...activities[0], id: 'x2', name: 'B Museum', durationHours: 2, rating: 4, bestTime: 'any' },
    ];
    const { itinerary } = await generate({ activities: lunchActivities, days: 1 });
    const [first, second] = itinerary[0].items;

    expect(first.endTime).toBe('13:30');
    expect(second.travelMinutesFromPrev).toBe(0);
    expect(second.startTime).toBe('14:30');
  });

  it('keeps evening items from starting before 17:00', async () => {
    const { itinerary } = await generate({ days: 5 });
    const eveningNames = activities.filter((a) => a.bestTime === 'evening').map((a) => a.name);
    const eveningItems = itinerary
      .flatMap((day) => day.items)
      .filter((item) => eveningNames.includes(item.name));

    expect(eveningItems.length).toBe(eveningNames.length);
    for (const item of eveningItems) {
      expect(toMinutes(item.startTime)).toBeGreaterThanOrEqual(17 * 60);
    }
  });

  it('skips activities that are longer than the daily capacity', async () => {
    const tooLong = { ...activities[0], id: 'long', name: 'All-day Trek', durationHours: 8, rating: 5 };
    const { itinerary } = await generate({ activities: [tooLong, activities[4]], pace: 'relaxed', days: 2 });

    expect(namesOf(itinerary)).toEqual(['Vashisht Hot Springs']);
  });

  it('marks days without activities as free days', async () => {
    const { itinerary } = await generate({ days: 10 });
    const freeDays = itinerary.filter((day) => day.items.length === 0);

    expect(itinerary).toHaveLength(10);
    expect(freeDays.length).toBeGreaterThan(0);
    for (const day of freeDays) {
      expect(day.note).toBe(FREE_DAY_NOTE);
      expect(day.totalVisitHours).toBe(0);
      expect(day.totalTravelKm).toBe(0);
    }
    expect(namesOf(itinerary)).toHaveLength(activities.length);
  });

  it('reports day totals that match the items', async () => {
    const { itinerary } = await generate();

    for (const day of itinerary) {
      const visitHours = day.items.reduce((sum, item) => sum + item.durationHours, 0);
      const travelKm = day.items.reduce((sum, item) => sum + item.travelKmFromPrev, 0);
      expect(day.totalVisitHours).toBe(visitHours);
      expect(day.totalTravelKm).toBeCloseTo(travelKm, 1);
    }
  });

  it('handles a destination with no activities', async () => {
    const { itinerary } = await generate({ activities: [], days: 2 });
    expect(itinerary.every((day) => day.note === FREE_DAY_NOTE)).toBe(true);
  });
});

describe('sumEntryFees', () => {
  it('adds up the entry fee of every scheduled item', async () => {
    const { itinerary } = await generate({ days: 10 });
    const expected = activities.reduce((sum, activity) => sum + activity.entryFee, 0);
    expect(sumEntryFees(itinerary)).toBe(expected);
  });
});
