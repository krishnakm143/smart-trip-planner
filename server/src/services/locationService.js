import { Destination } from '../models/Destination.js';
import { isDbConnected } from '../config/db.js';
import { config } from '../config/env.js';
import { getCatalogueDestinations } from './catalogueService.js';
import { haversineKm, roundTo } from '../utils/geo.js';
import { routeProvider } from '../providers/index.js';
import {
  findNearbyRegionalDestinations,
  reverseGeocodeDestination,
} from '../providers/dynamicDestinationProvider.js';
import { importDynamicDestination } from './destinationService.js';

/**
 * Finds catalogue destinations nearest to a browser-provided coordinate. The
 * coordinate is used for this request only; it is not logged or persisted.
 * Computes realistic driving road distance (via Google Routes API when available,
 * or realistic highway road model) and estimated driving time.
 */
export async function findNearestDestinations({ lat, lng, limit = 6 }) {
  const point = { lat, lng };
  const destinations = isDbConnected()
    ? await Destination.find().sort({ name: 1 })
    : getCatalogueDestinations();

  // 1. Initial filter/sort by straight-line air distance to identify candidate closest destinations
  const candidates = destinations.map((destination) => {
    const raw = typeof destination.toJSON === 'function' ? destination.toJSON() : destination;
    const airKm = haversineKm(point, raw.location);
    return {
      destination: raw,
      airKm,
    };
  });

  candidates.sort((a, b) => a.airKm - b.airKm);

  // Discover dynamic nearby regional destinations and reverse-geocode when not in test mode
  if (!config.isTest) {
    try {
      const nearbyRegional = await findNearbyRegionalDestinations(lat, lng, 160);
      for (const regional of nearbyRegional) {
        if (!candidates.some((c) => c.destination.slug === regional.slug)) {
          const imported = await importDynamicDestination(regional);
          const airKm = haversineKm(point, imported.location);
          candidates.push({
            destination: typeof imported.toJSON === 'function' ? imported.toJSON() : imported,
            airKm,
          });
        }
      }

      if (candidates.length === 0 || candidates[0].airKm > 100) {
        const localCandidate = await reverseGeocodeDestination(lat, lng);
        if (localCandidate && !candidates.some((c) => c.destination.slug === localCandidate.slug)) {
          const imported = await importDynamicDestination(localCandidate);
          const airKm = haversineKm(point, imported.location);
          candidates.push({
            destination: typeof imported.toJSON === 'function' ? imported.toJSON() : imported,
            airKm,
          });
        }
      }

      candidates.sort((a, b) => a.airKm - b.airKm);
    } catch {
      // Gracefully fall back to pre-seeded destinations
    }
  }

  const topCandidates = candidates.slice(0, Math.min(limit + 4, candidates.length));

  // 2. Compute driving road distances and durations
  const items = await Promise.all(
    topCandidates.map(async ({ destination, airKm }) => {
      if (airKm < 0.05) {
        return {
          ...destination,
          distanceKm: 0,
          drivingMinutes: 0,
          distanceType: 'road',
        };
      }

      try {
        if (routeProvider && typeof routeProvider.getLeg === 'function') {
          const leg = await routeProvider.getLeg(point, destination.location);
          if (leg && typeof leg.km === 'number') {
            return {
              ...destination,
              distanceKm: leg.km,
              drivingMinutes: leg.minutes,
              distanceType: 'road',
            };
          }
        }
      } catch {
        // Fall through to deterministic highway model
      }

      // Highway circuity factor (~1.38x) for Indian road transit
      const roadKm = roundTo(airKm * 1.38, 1);
      const drivingMinutes = Math.max(1, Math.round((roadKm / 55) * 60));
      return {
        ...destination,
        distanceKm: roadKm,
        drivingMinutes,
        distanceType: 'road',
      };
    }),
  );

  // 3. Sort by actual driving road distance
  items.sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));

  return { items: items.slice(0, limit) };
}
