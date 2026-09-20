import { roundTo } from '../../utils/geo.js';
import { fetchJson } from './fetchJson.js';

const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const MAX_ELEMENTS_PER_REQUEST = 100;
const MAX_POINTS = 25;

const toParam = (points) => points.map((point) => `${point.lat},${point.lng}`).join('|');

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
      console.warn(`Google Distance Matrix unavailable (${error.message}); using local estimates`);
      return fallback.getMatrix(points);
    }
  }

  async function getLeg(from, to) {
    const matrix = await getMatrix([from, to]);
    return matrix.leg(0, 1);
  }

  return { name: 'google', getMatrix, getLeg };
}
