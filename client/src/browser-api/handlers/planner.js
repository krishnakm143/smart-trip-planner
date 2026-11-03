import { generateDeterministicAssistantReply } from '@server/services/aiService.js'
import { estimateBudget } from '@server/services/budgetService.js'
import { allDestinations, findDestinationById } from '../catalogue'
import { buildPlan } from '../planner'
import { trips } from '../store'
import { validatePlanInput } from '../validate'
import { requireUser } from './auth'

export async function preview({ body }) {
  const plan = await buildPlan(validatePlanInput(body))
  const { id, name, slug, state, heroImage } = plan.destination

  return {
    data: {
      destination: { id, name, slug, state, heroImage },
      days: plan.days,
      itinerary: plan.itinerary,
      budget: plan.budget,
      budgetTier: plan.budgetTier,
      scenarios: plan.scenarios,
      feasibility: plan.feasibility,
    },
    meta: { provider: plan.provider },
  }
}

export function recommend({ body }) {
  const { maxBudget, days = 4, travelers = 2, interests = [], budgetTier = 'standard' } = body || {}
  const destinations = allDestinations()
  const results = []

  for (const dest of destinations) {
    const budget = estimateBudget({
      dailyCost: dest.dailyCost,
      tier: budgetTier,
      days,
      travelers,
      activityFeesPerPerson: 500,
    })

    const matchesInterests = interests.length === 0 || (dest.tags && interests.some((i) => dest.tags.includes(i)))
    const fitsBudget = !maxBudget || budget.total <= maxBudget * 1.15

    let score = (dest.rating || 4.5) * 10
    if (matchesInterests) score += 20
    if (fitsBudget) score += 15
    if (maxBudget && budget.total <= maxBudget) score += 10

    results.push({
      destination: {
        id: dest.id,
        name: dest.name,
        state: dest.state,
        slug: dest.slug,
        category: dest.category,
        heroImage: dest.heroImage,
        rating: dest.rating,
        bestSeason: dest.bestSeason,
        idealDays: dest.idealDays,
      },
      estimatedBudget: budget,
      score,
      matchesInterests,
      fitsBudget,
    })
  }

  results.sort((a, b) => b.score - a.score)
  return { data: { recommendations: results.slice(0, 6) } }
}

export function assistant({ token, params, body }) {
  const user = requireUser(token)
  const trip = trips.all().find((t) => t.id === params.id && t.user === user.id)
  if (!trip) throw new Error('Trip not found')
  const dest = findDestinationById(trip.destination)
  const answer = generateDeterministicAssistantReply({
    question: body?.question || '',
    trip: { ...trip, destination: dest },
  })
  return { data: { answer } }
}
