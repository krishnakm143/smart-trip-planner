import { Destination } from '../models/Destination.js';
import { isDbConnected } from '../config/db.js';
import { getCatalogueDestinations } from './catalogueService.js';
import { haversineKm, roundTo } from '../utils/geo.js';

/**
 * Finds catalogue destinations nearest to a browser-provided coordinate. The
 * coordinate is used for this request only; it is not logged or persisted.
 */
export async function findNearestDestinations({ lat, lng, limit }) {
  const point = { lat, lng };
  const destinations = isDbConnected()
    ? await Destination.find().sort({ name: 1 })
    : getCatalogueDestinations();

  const items = destinations
    .map((destination) => ({
      ...(typeof destination.toJSON === 'function' ? destination.toJSON() : destination),
      distanceKm: roundTo(haversineKm(point, destination.location), 1),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
    .slice(0, limit);
  return { items };
}
