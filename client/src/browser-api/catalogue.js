import { activitiesBySlug } from '@server/seed/activities.js'
import { destinations as seedDestinations } from '@server/seed/destinations.js'
import { ApiError } from '@server/utils/ApiError.js'
import { stableId } from './ids'

const regionalDestinations = [
  {
    name: 'Vadodara',
    slug: 'vadodara',
    state: 'Gujarat',
    country: 'India',
    category: 'heritage',
    tagline: 'Grand palaces, Banyan trees, cultural museums and royal heritage',
    description:
      'The cultural capital of Gujarat, Vadodara (Baroda) is famous for Laxmi Vilas Palace, Sayaji Baug gardens, and royal heritage.',
    heroImage: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
    location: { lat: 22.3072, lng: 73.1812 },
    bestSeason: 'October – March',
    idealDays: { min: 2, max: 4 },
    dailyCost: {
      economy: { stay: 1100, food: 450, transport: 350 },
      standard: { stay: 2800, food: 850, transport: 750 },
      luxury: { stay: 8500, food: 2000, transport: 1800 },
    },
    rating: 4.6,
    tags: ['palace', 'heritage', 'museum', 'gardens', 'gujarat', 'culture', 'temple', 'art', 'vadodara'],
    source: 'curated-dynamic',
  },
  {
    name: 'Pavagadh & Champaner',
    slug: 'pavagadh',
    state: 'Gujarat',
    country: 'India',
    category: 'heritage',
    tagline: 'UNESCO World Heritage fort, sacred Kalika temple and hill ruins',
    description:
      'Rising majestically above the plains near Vadodara, Pavagadh Hill is crowned by Kalika Mata Temple and Champaner UNESCO fort ruins.',
    heroImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    location: { lat: 22.4845, lng: 73.5314 },
    bestSeason: 'September – March',
    idealDays: { min: 1, max: 3 },
    dailyCost: {
      economy: { stay: 900, food: 400, transport: 300 },
      standard: { stay: 2400, food: 750, transport: 650 },
      luxury: { stay: 6500, food: 1600, transport: 1500 },
    },
    rating: 4.7,
    tags: ['unesco', 'temple', 'fort', 'heritage', 'ropeway', 'pavagadh', 'pilgrimage', 'hills', 'trekking', 'champaner'],
    source: 'curated-dynamic',
  },
  {
    name: 'Statue of Unity',
    slug: 'statue-of-unity',
    state: 'Gujarat',
    country: 'India',
    category: 'adventure',
    tagline: 'World’s tallest statue, Sardar Sarovar Dam and lush Narmada valley',
    description:
      'Standing 182 metres tall on the Narmada River near Vadodara, the Statue of Unity honors Sardar Vallabhbhai Patel.',
    heroImage: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=1200&q=80',
    location: { lat: 21.8385, lng: 73.7193 },
    bestSeason: 'October – March',
    idealDays: { min: 1, max: 3 },
    dailyCost: {
      economy: { stay: 1300, food: 500, transport: 400 },
      standard: { stay: 3200, food: 950, transport: 850 },
      luxury: { stay: 9500, food: 2200, transport: 2000 },
    },
    rating: 4.7,
    tags: ['monument', 'statue', 'narmada', 'dam', 'sightseeing', 'family', 'nature'],
    source: 'curated-dynamic',
  },
  {
    name: 'Ahmedabad',
    slug: 'ahmedabad',
    state: 'Gujarat',
    country: 'India',
    category: 'heritage',
    tagline: 'India’s first UNESCO World Heritage City, stepwells and Sabarmati',
    description:
      'A vibrant metropolis blending historic pols, exquisite stepwells, Sabarmati Ashram, and world-renowned street food.',
    heroImage: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
    location: { lat: 23.0225, lng: 72.5714 },
    bestSeason: 'October – March',
    idealDays: { min: 2, max: 4 },
    dailyCost: {
      economy: { stay: 1200, food: 500, transport: 400 },
      standard: { stay: 3000, food: 900, transport: 800 },
      luxury: { stay: 9000, food: 2200, transport: 2000 },
    },
    rating: 4.6,
    tags: ['unesco', 'heritage', 'sabarmati', 'stepwell', 'ahmedabad'],
    source: 'curated-dynamic',
  },
]

// The same records `npm run seed` writes to MongoDB, held in memory, augmented with regional destinations.
const destinations = [...seedDestinations, ...regionalDestinations].map((destination) => ({
  id: stableId(`destination:${destination.slug}`),
  ...destination,
}))

const activities = destinations.flatMap((destination) =>
  (activitiesBySlug[destination.slug] || []).map((activity) => ({
    id: stableId(`activity:${destination.slug}:${activity.name}`),
    destination: destination.id,
    ...activity,
    source: 'seed',
  })),
)

const byRatingThenName = (a, b) => b.rating - a.rating || a.name.localeCompare(b.name)

export const allDestinations = () => [...destinations].sort(byRatingThenName)

export const activitiesOf = (destinationId) =>
  activities.filter((activity) => activity.destination === destinationId).sort(byRatingThenName)

function findDestination(predicate) {
  const destination = destinations.find(predicate)
  if (!destination) throw ApiError.notFound('Destination not found')
  return destination
}

export const findDestinationById = (id) => findDestination((destination) => destination.id === id)

export const findDestinationBySlug = (slug) =>
  findDestination((destination) => destination.slug === slug)

export const addDestination = (destination) => {
  const existing = destinations.find((d) => d.slug === destination.slug || d.id === destination.id)
  if (existing) return existing
  destinations.push(destination)
  return destination
}
