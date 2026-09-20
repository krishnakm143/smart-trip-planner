import { config } from '../config/env.js';
import { createGooglePlacesProvider } from './google/placesProvider.js';
import { createGoogleRouteProvider } from './google/routeProvider.js';
import { localPlacesProvider } from './local/placesProvider.js';
import { localRouteProvider } from './local/routeProvider.js';
import { createOsmPlacesProvider } from './osm/placesProvider.js';
import { createOsmRouteProvider } from './osm/routeProvider.js';

/**
 * @typedef {{ lat: number, lng: number }} Point
 * @typedef {{ km: number, minutes: number }} Leg
 *
 * @typedef {object} RouteMatrix
 * @property {'local'|'osm'|'google'} provider  source that actually produced the legs
 * @property {(i: number, j: number) => Leg} leg  leg from points[i] to points[j]
 *
 * @typedef {object} RouteProvider
 * @property {string} name
 * @property {(points: Point[]) => Promise<RouteMatrix>} getMatrix
 *   All pairwise legs in one call; the itinerary service asks for this once per
 *   generation so Google is not hit once per leg.
 * @property {(from: Point, to: Point) => Promise<Leg>} getLeg  single leg
 *
 * @typedef {object} PlacesProvider
 * @property {string} name
 * @property {(destination: object, type?: string) => Promise<{ provider: string, items: object[] }>} discover
 *   items: { name, type, location, rating, address, externalId, source }
 *
 * MAPS_PROVIDER selects the pair: "local" (seeded data, haversine), "osm"
 * (Overpass places + OSRM road distances, free and keyless) or "google".
 * Remote providers fall back to the local ones on any upstream failure, so
 * `provider` in a result can be "local" even when a remote one is configured.
 */

const fallbacks = { route: localRouteProvider, places: localPlacesProvider };

function createProviders(name) {
  if (name === 'google') {
    const apiKey = config.googleMapsApiKey;
    return {
      route: createGoogleRouteProvider({ apiKey, fallback: fallbacks.route }),
      places: createGooglePlacesProvider({
        apiKey,
        fallback: fallbacks.places,
      }),
    };
  }
  if (name === 'osm') {
    return {
      route: createOsmRouteProvider({ fallback: fallbacks.route }),
      places: createOsmPlacesProvider({ fallback: fallbacks.places }),
    };
  }
  return fallbacks;
}

const providers = createProviders(config.mapsProvider);

export const providerName = config.mapsProvider;

/** @type {RouteProvider} */
export const routeProvider = providers.route;

/** @type {PlacesProvider} */
export const placesProvider = providers.places;
