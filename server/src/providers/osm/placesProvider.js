import { haversineKm } from '../../utils/geo.js';
import { fetchJson } from '../fetchJson.js';
import { DEFAULT_FILTER, TAG_FILTER_BY_TYPE, typeFromTags } from './placeTags.js';

// Overpass API: free read-only queries over OpenStreetMap, no key required.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_METRES = 12000;
const QUERY_TIMEOUT_SECONDS = 5;
const MAX_RESULTS = 12;
const CACHE_TTL_MS = 60 * 60 * 1000;
const USER_AGENT = 'SmartTripPlanner/1.0 (MCA minor project)';

function buildQuery(destination, type) {
  const { lat, lng } = destination.location;
  const filter = TAG_FILTER_BY_TYPE[type] ?? DEFAULT_FILTER;
  return (
    `[out:json][timeout:${QUERY_TIMEOUT_SECONDS}];` +
    `nwr(around:${SEARCH_RADIUS_METRES},${lat},${lng})${filter}[name];out center 60;`
  );
}

const pointOf = (element) =>
  element.type === 'node'
    ? { lat: element.lat, lng: element.lon }
    : element.center && { lat: element.center.lat, lng: element.center.lon };

// OSM has no ratings, so well-documented places (those linked to Wikidata or
// Wikipedia) come first and the rest are ordered by distance from the centre.
function rank(places, centre) {
  return places
    .map((place) => ({ ...place, km: haversineKm(centre, place.location) }))
    .sort(
      (a, b) =>
        Number(b.notable) - Number(a.notable) || a.km - b.km || a.name.localeCompare(b.name),
    );
}

async function searchPlaces(destination, type, headers) {
  const body = await fetchJson(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams({
      data: buildQuery(destination, type),
    }).toString(),
    timeoutMs: (QUERY_TIMEOUT_SECONDS + 1) * 1000,
  });

  const seen = new Set();
  const places = [];
  for (const element of body.elements ?? []) {
    const location = pointOf(element);
    const name = element.tags?.['name:en'] ?? element.tags?.name;
    const key = name?.toLowerCase();
    if (!location || !name || seen.has(key)) continue;
    seen.add(key);
    places.push({
      name,
      type: typeFromTags(element.tags, type),
      location,
      notable: Boolean(element.tags.wikidata || element.tags.wikipedia),
      externalId: `osm:${element.type}/${element.id}`,
    });
  }

  return rank(places, destination.location)
    .slice(0, MAX_RESULTS)
    .map(({ name, type: placeType, location, externalId }) => ({
      name,
      type: placeType,
      location,
      rating: null,
      address: `${destination.name}, ${destination.state}`,
      externalId,
      source: 'osm',
    }));
}

export function createOsmPlacesProvider({ fallback, headers = { 'User-Agent': USER_AGENT } }) {
  // The public Overpass server allows only a few requests a minute, and places
  // change slowly, so successful answers are reused for an hour.
  const cache = new Map();

  async function discover(destination, type) {
    const key = `${destination.id}:${type ?? 'all'}`;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { provider: 'osm', items: cached.items };
    }

    try {
      const items = await searchPlaces(destination, type, headers);
      if (items.length === 0) return fallback.discover(destination, type);
      cache.set(key, { items, expiresAt: Date.now() + CACHE_TTL_MS });
      return { provider: 'osm', items };
    } catch (error) {
      console.warn(`Overpass unavailable (${error.message}); using local activities`);
      return fallback.discover(destination, type);
    }
  }

  return { name: 'osm', discover };
}
