import { describe, expect, it } from 'vitest';
import { estimateBudget } from '../../src/services/budgetService.js';

const dailyCost = {
  economy: { stay: 1200, food: 500, transport: 400 },
  standard: { stay: 3000, food: 900, transport: 900 },
  luxury: { stay: 8500, food: 2000, transport: 2200 },
};

describe('estimateBudget', () => {
  it('follows the documented formula', () => {
    const budget = estimateBudget({
      dailyCost,
      tier: 'standard',
      days: 4,
      travelers: 2,
      activityFeesPerPerson: 1250,
    });

    expect(budget).toEqual({
      tier: 'standard',
      currency: 'INR',
      rooms: 1,
      nights: 3,
      breakdown: { stay: 9000, food: 7200, transport: 7200, activities: 2500 },
      total: 25900,
      perPerson: 12950,
    });
  });

  it('books one room per two travellers, rounding up', () => {
    expect(estimateBudget({ dailyCost, tier: 'economy', days: 3, travelers: 5 }).rooms).toBe(3);
    expect(estimateBudget({ dailyCost, tier: 'economy', days: 3, travelers: 1 }).rooms).toBe(1);
  });

  it('charges one night for a single-day trip', () => {
    const budget = estimateBudget({ dailyCost, tier: 'economy', days: 1, travelers: 2 });
    expect(budget.nights).toBe(1);
    expect(budget.breakdown.stay).toBe(1200);
  });

  it('defaults activity fees to zero', () => {
    const budget = estimateBudget({ dailyCost, tier: 'luxury', days: 2, travelers: 2 });
    expect(budget.breakdown.activities).toBe(0);
    expect(budget.total).toBe(8500 + 8000 + 8800);
  });

  it('rounds the per-person share to whole rupees', () => {
    const budget = estimateBudget({ dailyCost, tier: 'economy', days: 2, travelers: 3 });
    expect(budget.total).toBe(2400 + 3000 + 2400);
    expect(budget.perPerson).toBe(2600);
    expect(Number.isInteger(budget.perPerson)).toBe(true);
  });
});
