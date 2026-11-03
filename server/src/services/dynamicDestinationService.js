import { config } from '../config/env.js';
import { placesProvider } from '../providers/index.js';
import { stableId } from '../utils/ids.js';

/**
 * In-memory cache for dynamically discovered destinations from Google Places API.
 * Maps both id and slug to the destination object.
 */
const dynamicCache = new Map();

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

function inferCategory(types = [], name = '') {
  const t = (Array.isArray(types) ? types : []).map((x) => String(x).toLowerCase());
  const n = String(name || '').toLowerCase();

  if (t.includes('beach') || n.includes('beach') || n.includes('goa') || n.includes('island') || n.includes('coast')) {
    return 'beach';
  }
  if (
    t.includes('natural_feature') ||
    t.includes('park') ||
    n.includes('forest') ||
    n.includes('national park') ||
    n.includes('wildlife') ||
    n.includes('falls') ||
    n.includes('valley')
  ) {
    return 'nature';
  }
  if (
    n.includes('hill') ||
    n.includes('mount') ||
    n.includes('shimla') ||
    n.includes('manali') ||
    n.includes('darjeeling') ||
    n.includes('ooty') ||
    n.includes('peak') ||
    n.includes('kullu')
  ) {
    return 'hill-station';
  }
  if (
    t.includes('hindu_temple') ||
    t.includes('place_of_worship') ||
    n.includes('temple') ||
    n.includes('ashram') ||
    n.includes('spiritual') ||
    n.includes('math') ||
    n.includes('ghat')
  ) {
    return 'spiritual';
  }
  if (n.includes('desert') || n.includes('dunes') || n.includes('rann') || n.includes('thar') || n.includes('kutch')) {
    return 'desert';
  }
  return 'heritage';
}

const CATEGORY_HEROES = {
  heritage: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1000&q=80',
  'hill-station': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
  nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=80',
  spiritual: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1000&q=80',
  desert: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=80',
  adventure: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&w=1000&q=80',
};

function estimateDailyCost(category = 'heritage') {
  if (category === 'beach') {
    return {
      economy: { stay: 1400, food: 550, transport: 450 },
      standard: { stay: 3800, food: 1100, transport: 950 },
      luxury: { stay: 11500, food: 2600, transport: 2400 },
    };
  }
  if (category === 'hill-station' || category === 'nature') {
    return {
      economy: { stay: 1200, food: 450, transport: 450 },
      standard: { stay: 3200, food: 900, transport: 900 },
      luxury: { stay: 9500, food: 2200, transport: 2200 },
    };
  }
  return {
    economy: { stay: 1200, food: 450, transport: 350 },
    standard: { stay: 3500, food: 1000, transport: 800 },
    luxury: { stay: 12000, food: 2400, transport: 2200 },
  };
}

function buildDestinationFromPlace(place) {
  const name = place.displayName?.text?.trim() || '';
  if (!name || !place.location?.latitude || !place.location?.longitude) {
    return null;
  }

  const slug = slugify(name);
  const id = stableId(`destination:${slug}`);
  const state = place.formattedAddress || name;
  const category = inferCategory(place.types, name);
  const location = { lat: place.location.latitude, lng: place.location.longitude };

  let heroImage = CATEGORY_HEROES[category] || CATEGORY_HEROES.heritage;
  if (place.photos && place.photos.length > 0 && place.photos[0].name) {
    heroImage = `/api/v1/destinations/places/photo?name=${encodeURIComponent(place.photos[0].name)}`;
  }

  const destination = {
    id,
    _id: id,
    name,
    slug,
    state,
    country: 'India',
    category,
    tagline: place.editorialSummary?.text || `Discover ${name} — live attractions and dynamic itineraries`,
    description: `${name} located in ${state}. Live destination discovered via Google Places API.`,
    location,
    bestSeason: 'September – April',
    idealDays: { min: 2, max: 4 },
    dailyCost: estimateDailyCost(category),
    rating: typeof place.rating === 'number' ? place.rating : 4.5,
    tags: [slug, category, 'live-api', 'google-places'],
    heroImage,
    isDynamic: true,
    toJSON() {
      return { ...this };
    },
  };

  dynamicCache.set(id, destination);
  dynamicCache.set(slug, destination);
  return destination;
}

/**
 * Searches Google Places API for matching travel destinations or cities.
 */
export async function searchDynamicDestinations(query) {
  const apiKey = config.googleMapsApiKey;
  if (!apiKey || !query || query.trim().length < 2) {
    return [];
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.photos,places.editorialSummary',
      },
      body: JSON.stringify({
        textQuery: `${query.trim()} travel destination`,
        maxResultCount: 4,
      }),
    });

    const data = await res.json();
    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    const destinations = [];
    for (const place of data.places) {
      const dest = buildDestinationFromPlace(place);
      if (dest) destinations.push(dest);
    }
    return destinations;
  } catch (error) {
    console.warn(`Dynamic destination search failed: ${error.message}`);
    return [];
  }
}

/**
 * Resolves a single destination on-the-fly by its slug or name from Google Places API.
 */
export async function resolveDynamicDestination(slugOrName) {
  if (!slugOrName) return null;

  // Check cache first
  const cached = dynamicCache.get(slugOrName);
  if (cached) return cached;

  const apiKey = config.googleMapsApiKey;
  if (!apiKey) return null;

  const cleanQuery = String(slugOrName).replace(/[-_]/g, ' ').trim();
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.photos,places.editorialSummary',
      },
      body: JSON.stringify({
        textQuery: `${cleanQuery} travel destination city`,
        maxResultCount: 1,
      }),
    });

    const data = await res.json();
    const place = data.places?.[0];
    if (place) {
      return buildDestinationFromPlace(place);
    }
  } catch (error) {
    console.warn(`Dynamic destination resolution failed for ${slugOrName}: ${error.message}`);
  }

  return null;
}

export function getCachedDynamicDestination(idOrSlug) {
  return dynamicCache.get(idOrSlug) || null;
}

export async function discoverLiveActivitiesForDestination(destination) {
  if (!placesProvider) return [];

  try {
    const discovered = await placesProvider.discover(destination, 'sightseeing');
    if (discovered?.items?.length) {
      return discovered.items.map((item, idx) => ({
        id: item.externalId || stableId(`activity:${destination.slug}:${item.name}`),
        _id: item.externalId || stableId(`activity:${destination.slug}:${item.name}`),
        destination: destination.id,
        destinationSlug: destination.slug,
        name: item.name,
        type: item.type || 'culture',
        location: item.location,
        durationHours: 2,
        cost: {
          economy: 100,
          standard: 250,
          luxury: 500,
        },
        entryFee: item.type === 'heritage' || item.type === 'culture' ? 100 : 0,
        rating: item.rating || 4.5,
        bestTime: idx % 3 === 0 ? 'morning' : (idx % 3 === 1 ? 'afternoon' : 'evening'),
        address: item.address,
        source: 'google',
        photoUrl: item.photoUrl,
        toJSON() {
          return { ...this };
        },
      }));
    }
  } catch (error) {
    console.warn(`Live activity discovery failed for ${destination.name}: ${error.message}`);
  }

  return [];
}
