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
  'places.photos',
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
    .map((place) => {
      const item = {
        name: place.displayName.text,
        type: mapGoogleTypes(place.types, type),
        location: { lat: place.location.latitude, lng: place.location.longitude },
        rating: place.rating ?? null,
        address: place.formattedAddress ?? '',
        externalId: place.id,
        source: 'google',
      };
      if (place.photos && place.photos.length > 0 && place.photos[0].name) {
        item.photos = place.photos.map((p) => ({
          name: p.name,
          widthPx: p.widthPx,
          heightPx: p.heightPx,
        }));
        item.photoUrl = `/api/v1/destinations/places/photo?name=${encodeURIComponent(place.photos[0].name)}`;
      }
      return item;
    });
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
