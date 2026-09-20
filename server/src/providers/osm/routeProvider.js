import { roundTo } from '../../utils/geo.js';
import { fetchJson } from '../fetchJson.js';

// Public OSRM demo server: free, no key, driving profile on OpenStreetMap data.
const TABLE_URL = 'https://router.project-osrm.org/table/v1/driving';
const MAX_POINTS = 50;
const USER_AGENT = 'SmartTripPlanner/1.0 (MCA minor project)';

async function fetchMatrix(points) {
  if (points.length > MAX_POINTS) {
    throw new Error(`too many points for one table (${points.length})`);
  }

  // OSRM expects longitude first.
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const body = await fetchJson(`${TABLE_URL}/${coordinates}?annotations=distance,duration`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (body.code !== 'Ok') {
    throw new Error(`OSRM table code ${body.code}`);
  }

  return body.distances.map((row, i) =>
    row.map((metres, j) => {
      const seconds = body.durations[i][j];
      if (metres === null || seconds === null) {
        throw new Error('OSRM found no road between two points');
      }
      return {
        km: roundTo(metres / 1000, 1),
        minutes: Math.round(seconds / 60),
      };
    }),
  );
}

export function createOsmRouteProvider({ fallback }) {
  async function getMatrix(points) {
    if (points.length < 2) return fallback.getMatrix(points);

    try {
      const legs = await fetchMatrix(points);
      return { provider: 'osm', leg: (i, j) => legs[i][j] };
    } catch (error) {
      console.warn(`OSRM unavailable (${error.message}); using local estimates`);
      return fallback.getMatrix(points);
    }
  }

  async function getLeg(from, to) {
    const matrix = await getMatrix([from, to]);
    return matrix.leg(0, 1);
  }

  return { name: 'osm', getMatrix, getLeg };
}
