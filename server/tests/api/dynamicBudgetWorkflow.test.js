import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { startTestDb, stopTestDb } from '../helpers/db.js';
import { dateFromToday, seedDestination } from '../helpers/fixtures.js';
import { catalogueActivities } from '../../src/services/catalogueService.js';
import { Activity } from '../../src/models/Activity.js';

const api = request(createApp());
let manali;
let goa;

beforeAll(async () => {
  await startTestDb();
  manali = await seedDestination('manali');
  goa = await seedDestination('goa');

  // Insert Goa activities into test DB from catalogue
  const goaActs = catalogueActivities.filter((a) => a.destinationSlug === 'goa');
  if (goaActs.length > 0) {
    await Activity.insertMany(
      goaActs.map((a) => ({
        name: a.name,
        type: a.type,
        description: a.description,
        location: a.location,
        durationHours: a.durationHours,
        entryFee: a.entryFee,
        rating: a.rating,
        bestTime: a.bestTime,
        destination: goa.id,
      })),
    );
  }
});
afterAll(stopTestDb);

describe('Dynamic Budget-Based Trip Planning and Automatic Tier Comparison', () => {
  // Requirement 1: ₹10,000 budget with two travellers
  it('1. handles ₹10,000 budget with two travellers realistically and honestly', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10), // 4 days, 3 nights
      travelers: 2,
      maxBudget: 10000,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { budget, feasibility, scenarios, itinerary } = res.body.data;

    // Budget is below minimum realistic cost for 4 days in Manali (3 nights * 1200 + 4 days * 2 * 900 = 3600 + 7200 = 10,800 + acts)
    expect(feasibility.status).toBe('insufficient');
    expect(feasibility.shortfall).toBeGreaterThan(0);
    expect(feasibility.minimumCost).toBeGreaterThan(10000);
    expect(feasibility.alternatives.length).toBeGreaterThan(0);

    // Itinerary is generated with economy tier, prioritizing low-cost/free stops
    expect(itinerary).toHaveLength(4);
    expect(budget.tier).toBe('economy');
    expect(budget.target).toBe(10000);
    expect(budget.isWithinTarget).toBe(false);

    // Scenarios targets: 80% (8000), 100% (10000), 130% (13000)
    const ecoScenario = scenarios.find((s) => s.tier === 'economy');
    const stdScenario = scenarios.find((s) => s.tier === 'standard');
    const luxScenario = scenarios.find((s) => s.tier === 'luxury');
    expect(ecoScenario.target).toBe(8000);
    expect(stdScenario.target).toBe(10000);
    expect(luxScenario.target).toBe(13000);
    expect(ecoScenario.isAchievable).toBe(false);
  });

  // Requirement 2: ₹25,000 budget with two travellers
  it('2. handles ₹25,000 budget with two travellers with appropriate tier and buffer', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10), // 4 days
      travelers: 2,
      maxBudget: 25000,
    });

    expect(res.status).toBe(200);
    const { budget, feasibility, scenarios } = res.body.data;

    // Economy is ~11,000, Standard is ~24,000. ₹25,000 fits comfortably!
    expect(['feasible', 'tight']).toContain(feasibility.status);
    expect(budget.total).toBeLessThanOrEqual(26000);

    const std = scenarios.find((s) => s.tier === 'standard');
    expect(std.target).toBe(25000);
    expect(typeof std.difference).toBe('number');
  });

  // Requirement 3: ₹50,000 budget with four travellers
  it('3. calculates 2 rooms for four travellers and scales costs deterministically', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10), // 4 days, 3 nights
      travelers: 4,
      maxBudget: 50000,
    });

    expect(res.status).toBe(200);
    const { budget, scenarios } = res.body.data;

    // 4 travellers require 2 rooms
    expect(budget.rooms).toBe(2);
    expect(budget.nights).toBe(3);

    // Each scenario should calculate 2 rooms for stay
    scenarios.forEach((s) => {
      expect(s.rooms).toBe(2);
      expect(s.nights).toBe(3);
      expect(s.perPerson).toBe(Math.round(s.total / 4));
    });

    // Stay cost for economy: 2 rooms * 3 nights * 1200 = 7200
    const eco = scenarios.find((s) => s.tier === 'economy');
    expect(eco.breakdown.stay).toBe(7200);
    // Food: 4 travellers * 4 days * 500 = 8000
    expect(eco.breakdown.food).toBe(8000);
    // Transport: 4 travellers * 4 days * 400 = 6400
    expect(eco.breakdown.transport).toBe(6400);
  });

  // Requirement 4: Different destination selections
  it('4. uses destination-specific daily rates and activities', async () => {
    const manaliRes = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(9), // 3 days
      travelers: 2,
      maxBudget: 30000,
    });
    const goaRes = await api.post('/api/v1/planner/preview').send({
      destinationId: goa.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(9), // 3 days
      travelers: 2,
      maxBudget: 30000,
    });

    expect(manaliRes.status).toBe(200);
    expect(goaRes.status).toBe(200);

    const manaliEco = manaliRes.body.data.scenarios.find((s) => s.tier === 'economy');
    const goaEco = goaRes.body.data.scenarios.find((s) => s.tier === 'economy');

    // Goa dailyCost is higher (stay 1500, food 600, transport 500 vs Manali 1200, 500, 400)
    expect(goaEco.breakdown.stay).toBeGreaterThan(manaliEco.breakdown.stay);
    expect(goaEco.total).toBeGreaterThan(manaliEco.total);
  });

  // Requirement 5: Different durations
  it('5. scales accurately across different trip lengths (2 days vs 5 days)', async () => {
    const shortTrip = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(8), // 2 days, 1 night
      travelers: 2,
      maxBudget: 10000,
    });
    const longTrip = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(11), // 5 days, 4 nights
      travelers: 2,
      maxBudget: 10000,
    });

    expect(shortTrip.status).toBe(200);
    expect(longTrip.status).toBe(200);

    // 2 days in Manali economy: 1 night * 1200 + 2 days * 2 * 900 = 1200 + 3600 = 4800 (Fits in ₹10,000!)
    expect(['feasible', 'tight']).toContain(shortTrip.body.data.feasibility.status);
    expect(shortTrip.body.data.budget.isWithinTarget).toBe(true);

    // 5 days in Manali economy: 4 nights * 1200 + 5 days * 2 * 900 = 4800 + 9000 = 13800 (Exceeds ₹10,000!)
    expect(longTrip.body.data.feasibility.status).toBe('insufficient');
    expect(longTrip.body.data.budget.isWithinTarget).toBe(false);
  });

  // Requirement 6: Budget below minimum realistic trip cost
  it('6. does not fabricate estimates when budget is below minimum realistic cost', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: goa.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10), // 4 days
      travelers: 2,
      maxBudget: 5000,
    });

    expect(res.status).toBe(200);
    const { feasibility, budget } = res.body.data;

    expect(feasibility.status).toBe('insufficient');
    expect(feasibility.shortfall).toBe(feasibility.minimumCost - 5000);
    // Never fabricates numbers: budget.total is the honest estimate (~₹11,000+), not ₹5,000
    expect(budget.total).toBeGreaterThan(5000);
  });

  // Requirement 7: Budget above estimated costs
  it('7. automatically derives Luxury tier and reports buffer when budget is generous', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(10), // 4 days
      travelers: 2,
      maxBudget: 100000,
    });

    expect(res.status).toBe(200);
    const { budget, feasibility } = res.body.data;

    expect(feasibility.status).toBe('feasible');
    expect(budget.tier).toBe('luxury');
    expect(budget.isWithinTarget).toBe(true);
    expect(budget.difference).toBe(100000 - budget.total);
    expect(budget.difference).toBeGreaterThan(0);
  });

  // Requirement 8: Changing budget updates comparison targets dynamically
  it('8. updates comparison targets and differences when budget changes', async () => {
    const resA = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(9),
      travelers: 2,
      maxBudget: 20000,
    });
    const resB = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(9),
      travelers: 2,
      maxBudget: 40000,
    });

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const stdA = resA.body.data.scenarios.find((s) => s.tier === 'standard');
    const stdB = resB.body.data.scenarios.find((s) => s.tier === 'standard');

    expect(stdA.target).toBe(20000);
    expect(stdB.target).toBe(40000);
    expect(stdB.difference).toBeGreaterThan(stdA.difference);
  });

  // Requirement 9: Changing traveller count and dates
  it('9. adjusts accommodation rooms and per-person allocations on traveller change', async () => {
    const solo = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(9),
      travelers: 1,
      maxBudget: 15000,
    });
    const trio = await api.post('/api/v1/planner/preview').send({
      destinationId: manali.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(9),
      travelers: 3,
      maxBudget: 35000,
    });

    expect(solo.body.data.budget.rooms).toBe(1);
    expect(trio.body.data.budget.rooms).toBe(2); // 3 people need 2 rooms
  });

  // Requirement 10 & Goa ₹1,500 Discrepancy Fix
  it('10. guarantees comparison totals and generated itinerary remain synchronized (Goa discrepancy fixed)', async () => {
    const res = await api.post('/api/v1/planner/preview').send({
      destinationId: goa.id,
      startDate: dateFromToday(7),
      endDate: dateFromToday(9), // 3 days, 2 nights
      travelers: 2,
      budgetTier: 'economy',
    });

    expect(res.status).toBe(200);
    const { budget, scenarios, itinerary } = res.body.data;

    // Verify expensive Baga Beach Water Sports (₹1,500) was excluded from Economy itinerary
    const scheduledActivityNames = itinerary.flatMap((d) => d.items.map((i) => i.name));
    expect(scheduledActivityNames).not.toContain('Baga Beach Water Sports');

    // The comparison scenario total for economy MUST match the generated budget total
    const ecoScenario = scenarios.find((s) => s.tier === 'economy');
    expect(budget.total).toBe(ecoScenario.total);
    expect(budget.breakdown.activities).toBe(ecoScenario.breakdown.activities);

    // Exact math for 3 days, 2 travellers in Goa Economy:
    // 2 nights * 1500 stay = 3000
    // 3 days * 2 travellers * 1100 (600 food + 500 transport) = 6600
    // activities (all free attractions) = 0
    // Total = 9600. NO extra ₹1,500!
    expect(budget.total).toBe(9600);
    expect(ecoScenario.total).toBe(9600);
  });
});
