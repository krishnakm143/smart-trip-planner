import { haversineKm, roundTo } from '../../utils/geo.js';

const CITY_ROAD_FACTOR = 1.3;
const HIGHWAY_ROAD_FACTOR = 1.38;
const CITY_SPEED_KMH = 25;
const HIGHWAY_SPEED_KMH = 55;

function estimateLeg(from, to) {
  const airKm = haversineKm(from, to);
  if (airKm < 0.05) {
    return { km: 0, minutes: 0 };
  }

  const isHighway = airKm > 40;
  const factor = isHighway ? HIGHWAY_ROAD_FACTOR : CITY_ROAD_FACTOR;
  const speed = isHighway ? HIGHWAY_SPEED_KMH : CITY_SPEED_KMH;
  const km = roundTo(airKm * factor, 1);

  return {
    km,
    minutes: Math.max(1, Math.round((km / speed) * 60)),
  };
}

export const localRouteProvider = {
  name: 'local',

  async getMatrix(points) {
    const legs = points.map((from) => points.map((to) => estimateLeg(from, to)));
    return { provider: 'local', leg: (i, j) => legs[i][j] };
  },

  async getLeg(from, to) {
    return estimateLeg(from, to);
  },
};
