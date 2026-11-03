import { config } from '../config/env.js';
import { isDbConnected } from '../config/db.js';
import { Destination } from '../models/Destination.js';
import { getCatalogueDestinations } from './catalogueService.js';
import { estimateBudget } from './budgetService.js';
import { DESTINATION_FOOD_TIPS, generateDeterministicAssistantReply } from '../utils/assistantReply.js';

export { DESTINATION_FOOD_TIPS, generateDeterministicAssistantReply };

export async function answerTripQuestion({ question, trip }) {
  if (config.groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.groqModel || 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 600,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert Indian travel planning specialist. Provide accurate, practical, and culturally informed travel advice. Structure responses with markdown bullet points and bold headers. Do not hallucinate live ticket prices or unverified bookings.',
            },
            {
              role: 'user',
              content: `Trip details: ${JSON.stringify({
                title: trip.title,
                destination: trip.destination?.name,
                days: trip.days,
                travelers: trip.travelers,
                budgetTier: trip.budgetTier,
                totalBudget: trip.budget?.total,
                breakdown: trip.budget?.breakdown,
                pace: trip.pace,
                interests: trip.interests,
              })}\n\nQuestion from traveler: "${question}"`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        if (answer) return answer;
      }
    } catch {
      // Fall through to deterministic assistant
    }
  }

  return generateDeterministicAssistantReply({ question, trip });
}

export async function recommendDestinations({ maxBudget, days = 4, travelers = 2, interests = [], budgetTier = 'standard' }) {
  const destinations = isDbConnected() ? await Destination.find().lean() : getCatalogueDestinations();
  const results = [];

  for (const dest of destinations) {
    const budget = estimateBudget({
      dailyCost: dest.dailyCost,
      tier: budgetTier,
      days,
      travelers,
      activityFeesPerPerson: 500,
    });

    const matchesInterests = interests.length === 0 || (dest.tags && interests.some((i) => dest.tags.includes(i)));
    const fitsBudget = !maxBudget || budget.total <= maxBudget * 1.15;

    let score = (dest.rating || 4.5) * 10;
    if (matchesInterests) score += 20;
    if (fitsBudget) score += 15;
    if (maxBudget && budget.total <= maxBudget) score += 10;

    results.push({
      destination: {
        id: String(dest._id),
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
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 6);
}
