import { haversineKm, roundTo } from '../../utils/geo.js';

const ROAD_FACTOR = 1.3;
const AVERAGE_SPEED_KMH = 25;

function estimateLeg(from, to) {
  const km = haversineKm(from, to) * ROAD_FACTOR;
  return {
    km: roundTo(km, 1),
    minutes: Math.round((km / AVERAGE_SPEED_KMH) * 60),
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
