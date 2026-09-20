import * as plannerService from '../services/plannerService.js';
import { sendSuccess } from '../utils/respond.js';

export async function preview(req, res) {
  const plan = await plannerService.buildPlan(req.valid.body);
  const { id, name, slug, state, heroImage } = plan.destination;

  sendSuccess(
    res,
    {
      destination: { id, name, slug, state, heroImage },
      days: plan.days,
      itinerary: plan.itinerary,
      budget: plan.budget,
    },
    { meta: { provider: plan.provider } },
  );
}

export async function estimateBudget(req, res) {
  const budget = await plannerService.estimateDestinationBudget(req.valid.body);
  sendSuccess(res, { budget });
}
