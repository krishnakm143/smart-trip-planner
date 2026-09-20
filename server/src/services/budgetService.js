/**
 * Estimates the trip cost in whole rupees.
 * `stay` is priced per room per night; `food` and `transport` per person per day.
 */
export function estimateBudget({ dailyCost, tier, days, travelers, activityFeesPerPerson = 0 }) {
  const rates = dailyCost[tier];
  const nights = Math.max(days - 1, 1);
  const rooms = Math.ceil(travelers / 2);

  const breakdown = {
    stay: rates.stay * rooms * nights,
    food: rates.food * travelers * days,
    transport: rates.transport * travelers * days,
    activities: activityFeesPerPerson * travelers,
  };
  const total = breakdown.stay + breakdown.food + breakdown.transport + breakdown.activities;

  return {
    tier,
    currency: 'INR',
    rooms,
    nights,
    breakdown,
    total,
    perPerson: Math.round(total / travelers),
  };
}
