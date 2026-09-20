import { fetchJson } from '../fetchJson.js';
import { SEARCH_PHRASE_BY_TYPE, mapGoogleTypes } from './placeTypes.js';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const SEARCH_RADIUS_METRES = 50000;
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.types',
].join(',');

async function searchPlaces(apiKey, destination, type) {
  const phrase = SEARCH_PHRASE_BY_TYPE[type] ?? SEARCH_PHRASE_BY_TYPE.sightseeing;
  const body = await fetchJson(TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${phrase} in ${destination.name}, ${destination.state}`,
      pageSize: 12,
      locationBias: {
        circle: {
          center: { latitude: destination.location.lat, longitude: destination.location.lng },
          radius: SEARCH_RADIUS_METRES,
        },
      },
    }),
  });

  return (body.places ?? [])
    .filter((place) => place.displayName?.text && place.location)
    .map((place) => ({
      name: place.displayName.text,
      type: mapGoogleTypes(place.types, type),
      location: { lat: place.location.latitude, lng: place.location.longitude },
      rating: place.rating ?? null,
      address: place.formattedAddress ?? '',
      externalId: place.id,
      source: 'google',
    }));
}

export function createGooglePlacesProvider({ apiKey, fallback }) {
  async function discover(destination, type) {
    try {
      const items = await searchPlaces(apiKey, destination, type);
      return { provider: 'google', items };
    } catch (error) {
      console.warn(`Google Places unavailable (${error.message}); using local activities`);
      return fallback.discover(destination, type);
    }
  }

  return { name: 'google', discover };
}
