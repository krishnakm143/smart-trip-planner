import { buildPlan } from '../planner'
import { validatePlanInput } from '../validate'

export async function preview({ body }) {
  const plan = await buildPlan(validatePlanInput(body))
  const { id, name, slug, state, heroImage } = plan.destination

  return {
    data: {
      destination: { id, name, slug, state, heroImage },
      days: plan.days,
      itinerary: plan.itinerary,
      budget: plan.budget,
    },
    meta: { provider: plan.provider },
  }
}
