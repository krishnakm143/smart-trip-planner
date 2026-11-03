import { config } from '../config/env.js';
import { haversineKm } from '../utils/geo.js';
import { fetchJson } from './fetchJson.js';

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const OSM_NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'SmartTripPlanner/1.0 (MCA Project; mailto:info@smarttripplanner.com)';

const CATEGORY_IMAGES = {
  heritage: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
  'hill-station': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  spiritual: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  nature: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
  desert: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  adventure: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=1200&q=80',
};

export const CURATED_REGIONAL_DESTINATIONS = [
  {
    name: 'Vadodara',
    slug: 'vadodara',
    state: 'Gujarat',
    country: 'India',
    category: 'heritage',
    tagline: 'Grand palaces, Banyan trees, cultural museums and royal heritage',
    description:
      'The cultural capital of Gujarat, Vadodara (Baroda) is famous for the sprawling Laxmi Vilas Palace—four times the size of Buckingham Palace—Sayaji Baug gardens with its zoo and planetarium, Maharaja Fateh Singh Museum, and centuries-old stepwells and temples.',
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
      'Rising majestically above the plains near Vadodara, Pavagadh Hill is crowned by the revered Kalika Mata Temple and ancient shrines reachable by ropeway or stone steps. At the foot lies Champaner, a UNESCO World Heritage archaeological park with 16th-century mosques, grand gateways, fort ramparts, and hill bastions.',
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
    tags: ['unesco', 'temple', 'fort', 'heritage', 'ropeway', 'pavagadh', 'pilgrimage', 'hills', 'trekking', 'waterfall', 'champaner'],
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
      'Standing 182 metres tall on the Narmada River near Vadodara, the Statue of Unity honors Sardar Vallabhbhai Patel. The complex features a high-speed viewing gallery at 153m, the Valley of Flowers, river rafting, the Glow Garden, a butterfly park, and the engineering marvel of Sardar Sarovar Dam.',
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
      'A vibrant metropolis blending historic pols, exquisite stepwells like Adalaj, the iconic Sabarmati Ashram of Mahatma Gandhi, and intricate stone jaali at Sidi Saiyyed Mosque with cutting-edge textiles and world-renowned street food.',
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
    tags: ['unesco', 'heritage', 'gandhi', 'ashram', 'stepwell', 'food', 'textiles'],
    source: 'curated-dynamic',
  },
];

export const CURATED_REGIONAL_ACTIVITIES = {
  vadodara: [
    {
      name: 'Laxmi Vilas Palace',
      type: 'culture',
      description: 'The monumental 1890 royal residence of the Gaekwads, four times the size of Buckingham Palace, set in 500-acre grounds.',
      location: { lat: 22.2941, lng: 73.1925 },
      durationHours: 3,
      entryFee: 250,
      rating: 4.8,
      bestTime: 'morning',
    },
    {
      name: 'Sayaji Baug (Kamati Baug)',
      type: 'nature',
      description: 'Sprawling 113-acre park founded in 1879, featuring the Baroda Museum & Picture Gallery, planetarium, floral clock, and toy train.',
      location: { lat: 22.3129, lng: 73.1897 },
      durationHours: 2.5,
      entryFee: 20,
      rating: 4.6,
      bestTime: 'evening',
    },
    {
      name: 'Maharaja Fateh Singh Museum',
      type: 'culture',
      description: 'Housed in the former royal school, displaying an extraordinary collection of Raja Ravi Varma paintings and European marble sculptures.',
      location: { lat: 22.2925, lng: 73.1952 },
      durationHours: 2,
      entryFee: 150,
      rating: 4.7,
      bestTime: 'afternoon',
    },
    {
      name: 'EME Temple (Dakshinamurti)',
      type: 'spiritual',
      description: 'A geodesic aluminium-clad shrine built by Indian Army electrical and mechanical engineers, symbolizing religious harmony.',
      location: { lat: 22.3364, lng: 73.1928 },
      durationHours: 1.5,
      entryFee: 0,
      rating: 4.6,
      bestTime: 'morning',
    },
  ],
  pavagadh: [
    {
      name: 'Kalika Mata Temple & Pavagadh Summit',
      type: 'spiritual',
      description: 'Ancient hilltop Shakti Peetha shrine reachable by high-altitude passenger ropeway or stone stairway with panoramic valley views.',
      location: { lat: 22.4608, lng: 73.5218 },
      durationHours: 3.5,
      entryFee: 170,
      rating: 4.8,
      bestTime: 'morning',
    },
    {
      name: 'Champaner-Pavagadh UNESCO Archaeological Fort',
      type: 'culture',
      description: 'The 16th-century fortified capital of Sultan Mahmud Begada featuring massive stone bastions, defensive gates, and citadel ramparts.',
      location: { lat: 22.4852, lng: 73.5356 },
      durationHours: 2.5,
      entryFee: 40,
      rating: 4.7,
      bestTime: 'morning',
    },
    {
      name: 'Jama Masjid of Champaner',
      type: 'culture',
      description: 'A masterwork of Indo-Islamic stone architecture with 172 fluted columns, ornate jali lattice screens, and grand central domes.',
      location: { lat: 22.4878, lng: 73.5385 },
      durationHours: 1.5,
      entryFee: 40,
      rating: 4.8,
      bestTime: 'afternoon',
    },
    {
      name: 'Pavagadh Ropeway (Udan Khatola)',
      type: 'adventure',
      description: 'Scenic mono-cable ropeway ascending the steep volcanic cliffs of Pavagadh to the plateau shrine.',
      location: { lat: 22.4715, lng: 73.5255 },
      durationHours: 1,
      entryFee: 170,
      rating: 4.6,
      bestTime: 'morning',
    },
  ],
  'statue-of-unity': [
    {
      name: 'Statue of Unity Viewing Gallery',
      type: 'sightseeing',
      description: 'The 182-metre colossus on the Narmada River with a high-speed elevator to the chest-level viewing gallery at 153 metres.',
      location: { lat: 21.8385, lng: 73.7193 },
      durationHours: 3,
      entryFee: 380,
      rating: 4.8,
      bestTime: 'morning',
    },
    {
      name: 'Sardar Sarovar Dam Viewpoint',
      type: 'adventure',
      description: 'View the immense concrete gravity dam on the Narmada River, one of the largest water engineering projects in the world.',
      location: { lat: 21.8291, lng: 73.7482 },
      durationHours: 2,
      entryFee: 50,
      rating: 4.7,
      bestTime: 'afternoon',
    },
    {
      name: 'Valley of Flowers & Butterfly Garden',
      type: 'nature',
      description: 'A 24-acre landscaped floral paradise on the banks of the Narmada River with walking trails, photo points, and water cascades.',
      location: { lat: 21.8425, lng: 73.7152 },
      durationHours: 2,
      entryFee: 50,
      rating: 4.6,
      bestTime: 'evening',
    },
  ],
  ahmedabad: [
    {
      name: 'Sabarmati Ashram (Gandhi Ashram)',
      type: 'culture',
      description: 'The riverside spiritual and political headquarters where Mahatma Gandhi led the Indian independence struggle and launched the Salt March.',
      location: { lat: 23.0605, lng: 72.5802 },
      durationHours: 2,
      entryFee: 0,
      rating: 4.8,
      bestTime: 'morning',
    },
    {
      name: 'Adalaj Stepwell (Rudabai Stepwell)',
      type: 'culture',
      description: 'Spectacular 15th-century five-story subterranean stepwell with intricate sandstone carvings, Solanki-Islamic architecture, and octagonal shafts.',
      location: { lat: 23.1667, lng: 72.5802 },
      durationHours: 2,
      entryFee: 0,
      rating: 4.7,
      bestTime: 'morning',
    },
    {
      name: 'Sidi Saiyyed Mosque & Tree of Life Jaali',
      type: 'culture',
      description: 'Famed for its delicate 1573 marble lattice jali window portraying intertwined tree branches and foliage.',
      location: { lat: 23.0272, lng: 72.5815 },
      durationHours: 1,
      entryFee: 0,
      rating: 4.7,
      bestTime: 'afternoon',
    },
  ],
};

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferCategory(types = [], text = '') {
  const combined = (types.join(' ') + ' ' + text).toLowerCase();
  if (/beach|coastal|island|sea|ocean/.test(combined)) return 'beach';
  if (/mountain|hill|peak|valley|snow|ski|himalaya/.test(combined)) return 'hill-station';
  if (/temple|mosque|church|shrine|spiritual|ghat|pilgrimage|monastery/.test(combined)) return 'spiritual';
  if (/desert|dunes|arid|sand/.test(combined)) return 'desert';
  if (/adventure|trek|rafting|hiking|camping/.test(combined)) return 'adventure';
  if (/park|reserve|forest|wildlife|waterfall|lake|nature/.test(combined)) return 'nature';
  return 'heritage';
}

function estimateDailyCost(category, country = 'India') {
  const isIndia = country.toLowerCase() === 'india' || country.toLowerCase() === 'in';
  if (isIndia) {
    if (category === 'beach' || category === 'hill-station') {
      return {
        economy: { stay: 1400, food: 550, transport: 450 },
        standard: { stay: 3500, food: 1000, transport: 900 },
        luxury: { stay: 11000, food: 2500, transport: 2200 },
      };
    }
    return {
      economy: { stay: 1200, food: 500, transport: 400 },
      standard: { stay: 3000, food: 900, transport: 800 },
      luxury: { stay: 9000, food: 2200, transport: 2000 },
    };
  }

  return {
    economy: { stay: 3500, food: 1500, transport: 1000 },
    standard: { stay: 9000, food: 3000, transport: 2500 },
    luxury: { stay: 24000, food: 6000, transport: 5000 },
  };
}

function inferSeason(category) {
  if (category === 'hill-station') return 'March – June, October – February for snow';
  if (category === 'beach') return 'November – February';
  return 'October – March';
}

function generateTagline(name, state, category) {
  const titles = {
    heritage: `Historic architecture, majestic landmarks, and vibrant culture in ${name}`,
    'hill-station': `Scenic mountain heights, fresh alpine air, and tranquil landscapes in ${name}`,
    beach: `Sun-drenched coastlines, ocean breeze, and tropical getaways in ${name}`,
    spiritual: `Sacred shrines, ancient traditions, and peaceful spiritual aura in ${name}`,
    nature: `Verdant landscapes, untouched nature, and peaceful retreats in ${name}`,
    desert: `Golden dunes, starlit desert skies, and royal traditions in ${name}`,
    adventure: `Thrilling outdoors, exciting trails, and adventure sports in ${name}`,
  };
  const line = titles[category] || `Discover the sights, history, and charm of ${name}`;
  return line.length > 90 ? line.slice(0, 87) + '…' : line;
}

function generateDescription(name, state, country, category) {
  return `${name} is an exciting destination in ${state}, ${country}. Known for its distinctive ${category} appeal, welcoming atmosphere, and rich local character, it offers travelers an unforgettable journey filled with memorable sights, culinary delights, and authentic experiences.`;
}

/**
 * Searches Google Places API for destination cities/places.
 */
async function searchGooglePlaces(apiKey, query) {
  const body = await fetchJson(GOOGLE_PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.types,places.rating,places.editorialSummary',
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 5,
    }),
  });

  const seenSlugs = new Set();
  const candidates = [];

  for (const p of body.places ?? []) {
    if (!p.displayName?.text || !p.location) continue;
    const name = p.displayName.text;
    const addressParts = (p.formattedAddress || '').split(',').map((s) => s.trim());
    const country = addressParts.length > 1 ? addressParts[addressParts.length - 1] : 'India';
    const state = addressParts.length > 2 ? addressParts[addressParts.length - 2] : addressParts[0] || 'Region';
    const types = p.types || [];
    const category = inferCategory(types, `${name} ${p.formattedAddress || ''}`);

    let slug = slugify(name);
    if (seenSlugs.has(slug)) {
      slug = slugify(`${name}-${state || country}`);
    }
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    let heroImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.heritage;
    if (p.photos && p.photos.length > 0 && p.photos[0].name) {
      heroImage = `/api/v1/destinations/places/photo?name=${encodeURIComponent(p.photos[0].name)}`;
    }

    const tagline = p.editorialSummary?.text
      ? (p.editorialSummary.text.length > 90 ? p.editorialSummary.text.slice(0, 87) + '…' : p.editorialSummary.text)
      : generateTagline(name, state, category);

    const description = p.editorialSummary?.text || generateDescription(name, state, country, category);

    candidates.push({
      name,
      slug,
      state,
      country,
      category,
      tagline,
      description,
      heroImage,
      location: {
        lat: p.location.latitude,
        lng: p.location.longitude,
      },
      bestSeason: inferSeason(category),
      idealDays: { min: 2, max: 4 },
      dailyCost: estimateDailyCost(category, country),
      rating: p.rating ? Math.min(5, Math.max(0, p.rating)) : 4.5,
      tags: [category, 'travel', 'sightseeing', slug],
      source: 'google',
      externalId: p.id,
    });
  }

  return candidates;
}

/**
 * Searches OpenStreetMap Nominatim for destination places/cities.
 */
async function searchOsmNominatim(query) {
  const url = `${OSM_NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
  const results = await fetchJson(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
    timeoutMs: 5000,
  });

  if (!Array.isArray(results)) return [];

  return results
    .filter((item) => item.lat && item.lon)
    .map((item) => {
      const address = item.address || {};
      const name = address.city || address.town || address.village || address.municipality || item.name || query;
      const state = address.state || address.region || address.county || 'Region';
      const country = address.country || 'India';
      const category = inferCategory([item.type, item.class], `${name} ${item.display_name}`);
      const slug = slugify(name);

      return {
        name,
        slug,
        state,
        country,
        category,
        tagline: generateTagline(name, state, category),
        description: generateDescription(name, state, country, category),
        heroImage: CATEGORY_IMAGES[category] || CATEGORY_IMAGES.heritage,
        location: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
        bestSeason: inferSeason(category),
        idealDays: { min: 2, max: 4 },
        dailyCost: estimateDailyCost(category, country),
        rating: 4.5,
        tags: [category, 'travel', 'explore', slug],
        source: 'osm',
        externalId: `osm:${item.place_id}`,
      };
    });
}

/**
 * Searches external places/destinations via Google Places API or OSM Nominatim fallback.
 */
export async function searchExternalDestinations(query) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim().toLowerCase();

  // Check curated dynamic profiles first for highest quality matching
  const curatedMatches = CURATED_REGIONAL_DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(cleanQuery) ||
      d.slug.includes(cleanQuery) ||
      d.state.toLowerCase().includes(cleanQuery) ||
      d.tags.some((t) => t.includes(cleanQuery)),
  );

  if (config.googleMapsApiKey) {
    try {
      const googleResults = await searchGooglePlaces(config.googleMapsApiKey, query.trim());
      if (googleResults.length > 0) {
        // Merge without duplicating slugs
        const existingSlugs = new Set(curatedMatches.map((c) => c.slug));
        const merged = [...curatedMatches];
        googleResults.forEach((g) => {
          if (!existingSlugs.has(g.slug)) {
            merged.push(g);
            existingSlugs.add(g.slug);
          }
        });
        return merged;
      }
    } catch (err) {
      console.warn(`Google Places search failed: ${err.message}. Falling back to OpenStreetMap.`);
    }
  }

  if (curatedMatches.length > 0) {
    return curatedMatches;
  }

  try {
    return await searchOsmNominatim(query.trim());
  } catch (err) {
    console.warn(`OSM Nominatim search failed: ${err.message}`);
    return [];
  }
}

/**
 * Reverse geocodes coordinates to a plannable destination.
 */
export async function reverseGeocodeDestination(lat, lng) {
  const point = { lat: Number(lat), lng: Number(lng) };

  // Check if coordinates are close to a curated dynamic destination
  const matchedCurated = CURATED_REGIONAL_DESTINATIONS.find(
    (d) => haversineKm(point, d.location) <= 30,
  );
  if (matchedCurated) {
    return matchedCurated;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const data = await fetchJson(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeoutMs: 4000,
    });
    if (!data || !data.address) return null;
    const address = data.address;
    const name = address.city || address.town || address.village || address.county || address.state_district || 'Local Area';
    const state = address.state || address.region || address.county || 'Region';
    const country = address.country || 'India';
    const category = inferCategory([data.type, data.class], `${name} ${data.display_name}`);
    const slug = slugify(name);

    return {
      name,
      slug,
      state,
      country,
      category,
      tagline: generateTagline(name, state, category),
      description: generateDescription(name, state, country, category),
      heroImage: CATEGORY_IMAGES[category] || CATEGORY_IMAGES.heritage,
      location: { lat: Number(lat), lng: Number(lng) },
      bestSeason: inferSeason(category),
      idealDays: { min: 2, max: 4 },
      dailyCost: estimateDailyCost(category, country),
      rating: 4.5,
      tags: [category, 'travel', 'local', slug],
      source: 'osm',
    };
  } catch (err) {
    console.warn(`Reverse geocode failed: ${err.message}`);
    return null;
  }
}

/**
 * Discovers nearby destinations around the given coordinates within radiusKm.
 */
export async function findNearbyRegionalDestinations(lat, lng, radiusKm = 160) {
  const point = { lat: Number(lat), lng: Number(lng) };
  const regionalMatches = CURATED_REGIONAL_DESTINATIONS.filter((d) => {
    const km = haversineKm(point, d.location);
    return km <= radiusKm;
  });

  return regionalMatches;
}
