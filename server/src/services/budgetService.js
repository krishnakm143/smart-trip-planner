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
    activities: Math.round(activityFeesPerPerson * travelers),
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

/**
 * Calculates deterministic activity fee estimates per person by tier.
 * Economy prioritizes free / low-cost attractions (<= ₹200).
 * Standard includes mid-range sights (<= ₹600).
 * Luxury includes premier attractions and adventure activities.
 */
export function calculateTierActivityEstimate(activities = [], tier, days = 3) {
  if (!activities || activities.length === 0) {
    if (tier === 'economy') return 0;
    if (tier === 'standard') return 150 * days;
    return 500 * days;
  }

  const maxStops = Math.min(activities.length, days * 2);

  if (tier === 'economy') {
    // Only activities with entry fee <= 200 (e.g. Free or minimal entry fee)
    const economical = activities
      .filter((a) => (a.entryFee ?? 0) <= 200)
      .slice(0, maxStops);
    return economical.reduce((sum, a) => sum + (a.entryFee ?? 0), 0);
  }

  if (tier === 'standard') {
    const standard = activities
      .filter((a) => (a.entryFee ?? 0) <= 600)
      .slice(0, maxStops);
    return standard.reduce((sum, a) => sum + (a.entryFee ?? 0), 0);
  }

  // Luxury includes all premier / adventure activities
  const luxury = [...activities].slice(0, maxStops);
  return luxury.reduce((sum, a) => sum + (a.entryFee ?? 0), 0);
}

const TIER_TARGET_RATIOS = {
  economy: 0.8,
  standard: 1.0,
  luxury: 1.3,
};

const TIER_LABELS = {
  economy: { label: 'Economy', title: 'Economical', summary: 'Hostels and guesthouses, local buses, dhaba meals.' },
  standard: { label: 'Standard', title: 'Standard', summary: 'Three-star hotels, cabs for the day, sit-down restaurants.' },
  luxury: { label: 'Luxury', title: 'Premium', summary: 'Resorts and heritage stays, private car, fine dining.' },
};

/**
 * Calculates 3 comparison scenarios dynamically:
 * - Economy (~80% target)
 * - Standard (~100% target)
 * - Luxury (~130% target)
 *
 * Uses actual cost models (accommodation, food, local transport, travel, activities, contingency).
 */
export function calculateComparisonScenarios({
  dailyCost,
  days,
  travelers,
  maxBudget,
  travelToDestinationCost = 0,
  contingencyPercent = 0,
  activities = [],
}) {
  const travel = travelToDestinationCost || 0;
  const tiers = ['economy', 'standard', 'luxury'];

  return tiers.map((tier) => {
    const ratio = TIER_TARGET_RATIOS[tier];
    const target = maxBudget ? Math.round(maxBudget * ratio) : null;
    const activityFeesPerPerson = calculateTierActivityEstimate(activities, tier, days);
    const base = estimateBudget({ dailyCost, tier, days, travelers, activityFeesPerPerson });

    const subtotal = base.total + travel;
    const contingency = contingencyPercent ? Math.round((subtotal * contingencyPercent) / 100) : 0;
    const total = subtotal + contingency;
    const perPerson = Math.round(total / travelers);
    const dailyTotal = Math.round(total / days);

    const difference = maxBudget !== undefined && maxBudget !== null ? maxBudget - total : null;
    const isAchievable = maxBudget !== undefined && maxBudget !== null ? total <= maxBudget : true;

    let status = 'achievable';
    if (maxBudget !== undefined && maxBudget !== null) {
      if (total <= maxBudget) status = 'achievable';
      else if (total <= maxBudget * 1.15) status = 'tight';
      else status = 'exceeds';
    }

    return {
      tier,
      label: TIER_LABELS[tier].label,
      title: TIER_LABELS[tier].title,
      summary: TIER_LABELS[tier].summary,
      targetRatio: ratio,
      target,
      total,
      perPerson,
      dailyTotal,
      difference,
      isAchievable,
      status,
      rooms: base.rooms,
      nights: base.nights,
      breakdown: {
        stay: base.breakdown.stay,
        food: base.breakdown.food,
        transport: base.breakdown.transport + travel,
        localTransport: base.breakdown.transport,
        intercityTravel: travel,
        activities: base.breakdown.activities,
        contingency,
      },
    };
  });
}

/**
 * Assesses budget feasibility before itinerary generation.
 * Outlines Outcome A (feasible), B (tight), or C (insufficient) with actionable alternatives.
 */
export function assessBudgetFeasibility({
  dailyCost,
  days,
  travelers,
  maxBudget,
  travelToDestinationCost = 0,
  contingencyPercent = 0,
  activities = [],
}) {
  const scenarios = calculateComparisonScenarios({
    dailyCost,
    days,
    travelers,
    maxBudget,
    travelToDestinationCost,
    contingencyPercent,
    activities,
  });

  const economy = scenarios.find((s) => s.tier === 'economy');
  const standard = scenarios.find((s) => s.tier === 'standard');
  const minimumCost = economy.total;

  if (maxBudget === undefined || maxBudget === null) {
    return {
      status: 'unspecified',
      minimumCost,
      standardCost: standard.total,
      shortfall: 0,
      buffer: 0,
      scenarios,
      alternatives: [],
    };
  }

  if (maxBudget >= standard.total) {
    return {
      status: 'feasible',
      minimumCost,
      standardCost: standard.total,
      buffer: maxBudget - standard.total,
      shortfall: 0,
      message: `Your ₹${maxBudget.toLocaleString('en-IN')} budget comfortably covers a Standard trip (~₹${standard.total.toLocaleString('en-IN')}) with a ₹${(maxBudget - standard.total).toLocaleString('en-IN')} buffer.`,
      scenarios,
      alternatives: [],
    };
  }

  if (maxBudget >= minimumCost) {
    return {
      status: 'tight',
      minimumCost,
      standardCost: standard.total,
      buffer: maxBudget - minimumCost,
      shortfall: 0,
      message: `Your ₹${maxBudget.toLocaleString('en-IN')} budget is achievable on an Economical plan (~₹${minimumCost.toLocaleString('en-IN')}). We will prioritize free activities and budget travel.`,
      scenarios,
      alternatives: [],
    };
  }

  // Budget is insufficient: calculate shortfall and practical alternatives
  const shortfall = minimumCost - maxBudget;
  const rooms = Math.ceil(travelers / 2);
  const ecoRates = dailyCost.economy;
  const travel = travelToDestinationCost || 0;
  const dailyRate = ecoRates.stay * rooms + (ecoRates.food + ecoRates.transport) * travelers;
  const feasibleDays = Math.max(1, Math.floor((maxBudget - travel) / Math.max(1, dailyRate)));

  // Calculate solo trip cost if travellers > 1
  const soloDaily = ecoRates.stay * 1 + (ecoRates.food + ecoRates.transport) * 1;
  const soloTotal = soloDaily * days + travel;

  const alternatives = [
    ...(feasibleDays < days
      ? [
          {
            type: 'reduce_days',
            days: feasibleDays,
            label: `Shorten trip to ${feasibleDays} ${feasibleDays === 1 ? 'day' : 'days'} (~₹${(feasibleDays * dailyRate + travel).toLocaleString('en-IN')})`,
          },
        ]
      : []),
    ...(travelers > 1
      ? [
          {
            type: 'solo_trip',
            travelers: 1,
            label: `Travel solo (1 traveller, ~₹${soloTotal.toLocaleString('en-IN')})`,
          },
        ]
      : []),
    {
      type: 'adjust_budget',
      targetBudget: minimumCost,
      label: `Adjust budget to minimum realistic estimate (₹${minimumCost.toLocaleString('en-IN')})`,
    },
  ];

  return {
    status: 'insufficient',
    minimumCost,
    standardCost: standard.total,
    shortfall,
    feasibleDays,
    message: `Your ₹${maxBudget.toLocaleString('en-IN')} budget is below the minimum economical estimate (~₹${minimumCost.toLocaleString('en-IN')}) for ${days} days and ${travelers} travellers.`,
    alternatives,
    scenarios,
  };
}

/**
 * Derives the optimal achievable budget tier for a given target budget.
 */
export function deriveOptimalTier(dailyCost, days, travelers, maxBudget, travelToDestinationCost = 0, activities = []) {
  if (!maxBudget || maxBudget <= 0) return 'standard';

  const travel = travelToDestinationCost || 0;
  const tiers = ['luxury', 'standard', 'economy'];

  for (const tier of tiers) {
    const activityFeesPerPerson = calculateTierActivityEstimate(activities, tier, days);
    const est = estimateBudget({
      dailyCost,
      tier,
      days,
      travelers,
      activityFeesPerPerson,
    });
    const totalWithTravel = est.total + travel;
    if (totalWithTravel <= maxBudget) {
      return tier;
    }
  }

  return 'economy';
}

