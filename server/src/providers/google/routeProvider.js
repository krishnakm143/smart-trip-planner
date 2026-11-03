import { haversineKm, roundTo } from '../../utils/geo.js';
import { fetchJson } from '../fetchJson.js';

const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const ROUTES_V2_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const MAX_ELEMENTS_PER_REQUEST = 100;
const MAX_POINTS = 25;

const toParam = (points) => points.map((point) => `${point.lat},${point.lng}`).join('|');

async function fetchGoogleRouteLeg(apiKey, from, to) {
  const airKm = haversineKm(from, to);
  if (airKm < 0.05) {
    return { km: 0, minutes: 0 };
  }

  const res = await fetch(ROUTES_V2_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Google Routes API: ${data.error.message || data.error.status}`);
  }

  const route = data.routes?.[0];
  if (!route || typeof route.distanceMeters !== 'number') {
    throw new Error('Google Routes API returned no valid route');
  }

  const km = roundTo(route.distanceMeters / 1000, 1);
  const seconds = parseInt((route.duration || '').replace('s', '') || '0', 10);
  const minutes = Math.max(1, Math.round(seconds / 60));

  return { km, minutes };
}

async function fetchRows(apiKey, origins, destinations) {
  const query = new URLSearchParams({
    origins: toParam(origins),
    destinations: toParam(destinations),
    mode: 'driving',
    units: 'metric',
    key: apiKey,
  });
  const body = await fetchJson(`${DISTANCE_MATRIX_URL}?${query}`);
  if (body.status !== 'OK') {
    throw new Error(`Distance Matrix status ${body.status}`);
  }

  return body.rows.map((row) =>
    row.elements.map((element) => {
      if (element.status !== 'OK') {
        throw new Error(`Distance Matrix element status ${element.status}`);
      }
      return {
        km: roundTo(element.distance.value / 1000, 1),
        minutes: Math.round(element.duration.value / 60),
      };
    }),
  );
}

// The API allows 100 elements per request, so origins are sent in row chunks.
async function fetchMatrix(apiKey, points) {
  if (points.length > MAX_POINTS) {
    throw new Error(`too many points for one matrix (${points.length})`);
  }

  const rowsPerRequest = Math.max(1, Math.floor(MAX_ELEMENTS_PER_REQUEST / points.length));
  const requests = [];
  for (let start = 0; start < points.length; start += rowsPerRequest) {
    requests.push(fetchRows(apiKey, points.slice(start, start + rowsPerRequest), points));
  }
  return (await Promise.all(requests)).flat();
}

export function createGoogleRouteProvider({ apiKey, fallback }) {
  async function getMatrix(points) {
    if (points.length < 2) return fallback.getMatrix(points);

    try {
      const legs = await fetchMatrix(apiKey, points);
      return { provider: 'google', leg: (i, j) => legs[i][j] };
    } catch (error) {
      // If 2-point matrix failed on Distance Matrix API, try modern Routes API v2
      if (points.length === 2) {
        try {
          const leg01 = await fetchGoogleRouteLeg(apiKey, points[0], points[1]);
          const legs = [
            [{ km: 0, minutes: 0 }, leg01],
            [leg01, { km: 0, minutes: 0 }],
          ];
          return { provider: 'google', leg: (i, j) => legs[i][j] };
        } catch {
          // Fall through to fallback
        }
      }
      console.warn(`Google Distance Matrix unavailable (${error.message}); using local estimates`);
      return fallback.getMatrix(points);
    }
  }

  async function getLeg(from, to) {
    try {
      const matrix = await getMatrix([from, to]);
      if (matrix.provider === 'google') {
        return matrix.leg(0, 1);
      }
    } catch {
      // Try Routes API v2 directly
    }

    try {
      return await fetchGoogleRouteLeg(apiKey, from, to);
    } catch (error) {
      console.warn(`Google Routes API getLeg unavailable (${error.message}); using fallback`);
      return fallback.getLeg(from, to);
    }
  }

  return { name: 'google', getMatrix, getLeg };
}
