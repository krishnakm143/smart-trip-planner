import { config } from '../config/env.js';
import { isDbConnected } from '../config/db.js';
import { Destination } from '../models/Destination.js';
import { getCatalogueDestinations } from './catalogueService.js';
import { estimateBudget } from './budgetService.js';

const DESTINATION_FOOD_TIPS = {
  manali: ['Trout fish prepared Himachali style', 'Siddu with ghee and dal', 'Tibetan Thukpa and Momos in Old Manali'],
  shimla: ['Chha Gosht and Madra', 'Warm cinnamon bakery goods on the Mall Road', 'Pahari Dham feasts'],
  jaipur: ['Authentic Dal Baati Churma at traditional thali dining', 'Pyaaz Kachori and Ghewar from Johari Bazaar', 'Lassi in earthen kulhads'],
  udaipur: ['Laal Maas (traditional spicy mutton curry)', 'Gatte ki Sabzi with Bajra Roti', 'Kachoris at Jagdish Chowk'],
  goa: ['Goan Fish Curry Thali with red rice', 'Pork Vindaloo or Chicken Xacuti', 'Bebinca layered dessert'],
  munnar: ['Kerala Malabar Parotta with vegetable or meat stew', 'Fresh cardamon and spiced plantation teas', 'Appam with coconut milk'],
  varanasi: ['Banarasi Kachori Sabzi for breakfast', 'Tamatar Chaat and Malaiyo (winter sweet)', 'Banarasi Paan'],
  rishikesh: ['Ayurvedic satvik thalis', 'Wood-fired organic pizzas along Laxman Jhula', 'Fresh ginger lemon honey tea by the Ganges'],
  hampi: ['Karnataka Jolada Roti meals with spicy chutney', 'Banana flower curries and freshly squeezed sugarcane juice', 'Filter coffee in Anegundi'],
  ladakh: ['Skyu (traditional Ladakhi pasta soup)', 'Chhurpi yak cheese snacks', 'Butter tea (Gur Gur chai) and Tingmo steamed buns'],
  coorg: ['Pandi (Pork) curry with Kadambuttu (steamed rice balls)', 'Bamboo shoot curry and Akki Roti', 'Coorg plantation Arabica filter coffee'],
  darjeeling: ['Authentic Darjeeling First Flush tea', 'Tibetan Thukpa and Shaphaley', 'Churpee cheese soup'],
};

export function generateDeterministicAssistantReply({ question, trip }) {
  const q = question.toLowerCase();
  const destName = trip.destination?.name || 'your destination';
  const destSlug = trip.destination?.slug?.toLowerCase() || '';
  const totalBudget = trip.budget?.total ? `₹${trip.budget.total.toLocaleString('en-IN')}` : 'your planned estimate';
  const perPerson = trip.budget?.perPerson ? `₹${trip.budget.perPerson.toLocaleString('en-IN')}` : '';

  if (q.includes('pack') || q.includes('bring') || q.includes('cloth') || q.includes('bag')) {
    const isCold = ['manali', 'shimla', 'ladakh', 'darjeeling'].includes(destSlug);
    const isBeach = ['goa'].includes(destSlug);
    const isWalk = ['hampi', 'jaipur', 'udaipur', 'varanasi', 'rishikesh'].includes(destSlug);

    const clothing = isCold
      ? 'Thermal innerwear, fleece jackets, woollen socks, gloves, and a windproof down jacket.'
      : isBeach
        ? 'Lightweight linen/cotton shirts, quick-dry swimsuits, sun hats, and UV protective sunglasses.'
        : 'Breathable modest cotton garments, scarf/stole for temple and heritage sites, and versatile layering.';

    const footwear = isWalk
      ? 'Comfortable, broken-in walking shoes or hiking sneakers with good traction for stone steps and uneven terrain.'
      : 'Sturdy walking shoes and water-resistant slip-ons.';

    return `🎒 **Packing Recommendations for ${destName} (${trip.days} Days)**:\n\n` +
      `• **Clothing:** ${clothing}\n` +
      `• **Footwear:** ${footwear}\n` +
      `• **Health & Toiletries:** Broad-spectrum SPF 50+ sunscreen, insect repellent, personal medications, motion sickness pills for mountain roads, and rehydration salts (ORS).\n` +
      `• **Electronics:** High-capacity power bank (10,000+ mAh), universal charging cables, and camera gear.\n` +
      `• **Documents:** Government photo IDs (Aadhaar/Passport), emergency contact printouts, and digital/physical booking vouchers.\n\n` +
      `*Tip: Keep your daypack under 4 kg so you can explore comfortably without fatigue.*`;
  }

  if (q.includes('save') || q.includes('budget') || q.includes('cheap') || q.includes('cost') || q.includes('money')) {
    const stayCost = trip.budget?.breakdown?.stay ? `₹${trip.budget.breakdown.stay.toLocaleString('en-IN')}` : 'stay';
    const foodCost = trip.budget?.breakdown?.food ? `₹${trip.budget.breakdown.food.toLocaleString('en-IN')}` : 'meals';

    return `💡 **Budget Optimization Strategy for ${trip.title || destName}**:\n\n` +
      `Your current estimated budget is **${totalBudget}**${perPerson ? ` (${perPerson} per person)` : ''}.\n\n` +
      `1. **Accommodation (${stayCost}):** Consider booking homestays or verified 3-star boutique guest houses rather than luxury resorts. Look for rooms with complimentary breakfast included.\n` +
      `2. **Food & Dining (${foodCost}):** Experience celebrated heritage eateries and thali joints during lunch; reserve fine dining for select dinners.\n` +
      `3. **Local Transit:** Hire a daily vehicle package rather than multiple on-demand cabs, or use local electric rickshaws and metro/public transit where available.\n` +
      `4. **Sightseeing:** Check for combined composite entry tickets at monuments and historical complexes to save up to 40% on individual ticket counters.\n` +
      `5. **Buffer:** Maintain an emergency cash buffer of at least 10% for remote points of interest where UPI/cards might have patchy signal.`;
  }

  if (q.includes('food') || q.includes('eat') || q.includes('restaurant') || q.includes('dish') || q.includes('dinner') || q.includes('lunch')) {
    const foods = DESTINATION_FOOD_TIPS[destSlug] || [
      'Authentic regional thalis featuring local vegetables and grains',
      'Popular street food from time-tested stalls',
      'Fresh artisanal regional desserts',
    ];
    return `🍽️ **Culinary Highlights in ${destName}**:\n\n` +
      foods.map((dish, i) => `${i + 1}. **${dish}**`).join('\n') +
      `\n\n*Dining Advice:* Lunch between 12:30 PM – 2:00 PM for the freshest batch of daily specials. Carry mineral water and dine at busy spots with high turnover.`;
  }

  if (q.includes('weather') || q.includes('season') || q.includes('climate') || q.includes('when')) {
    const season = trip.destination?.bestSeason || 'October to March';
    return `☀️ **Weather & Seasonal Advisory for ${destName}**:\n\n` +
      `• **Optimal Season:** Best visited from **${season}**.\n` +
      `• **Day vs Night Variation:** Daytime temperatures are typically pleasant for exploration, while early mornings and evenings can be noticeably cooler.\n` +
      `• **Planning Advice:** Keep early afternoon (1:00 PM – 3:00 PM) for indoor museums or leisurely dining during sunny days, and schedule outdoor viewpoints around golden hour.`;
  }

  if (q.includes('itinerary') || q.includes('schedule') || q.includes('plan') || q.includes('day')) {
    const dayCount = trip.itinerary?.length || trip.days || 1;
    const totalStops = trip.itinerary?.reduce((acc, d) => acc + (d.items?.length || 0), 0) || 0;
    return `🗺️ **Itinerary Overview for ${destName}**:\n\n` +
      `Your trip spans **${dayCount} days** with **${totalStops} planned stops** structured at a **${trip.pace || 'balanced'} pace**.\n\n` +
      `• Mornings begin with scenic and high-energy sightseeing to beat peak crowds.\n` +
      `• Midday features structured lunch breaks to recharge.\n` +
      `• Evenings are reserved for bazaars, sunset viewpoints, and cultural experiences.\n\n` +
      `*Recommendation: Feel free to reorder or add custom rest breaks directly in the Interactive Itinerary Builder if you prefer a slower rhythm!*`;
  }

  return `✨ **Smart Assistant Note for ${destName}**:\n\n` +
    `Your trip **"${trip.title || `${destName} Getaway`}"** is scheduled for **${trip.days} days** with **${trip.travelers} traveler(s)** under the **${trip.budgetTier || 'standard'} tier** with an estimated budget of **${totalBudget}**.\n\n` +
    `You can ask me about:\n` +
    `• Packing essentials tailored to the local climate\n` +
    `• Ways to optimize your budget and reduce travel costs\n` +
    `• Famous local cuisine and dining spots\n` +
    `• Weather conditions and timing tips for activities\n\n` +
    `How can I help you customize this journey?`;
}

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
