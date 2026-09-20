import { config } from '../config/env.js';
import { createGooglePlacesProvider } from './google/placesProvider.js';
import { createGoogleRouteProvider } from './google/routeProvider.js';
import { localPlacesProvider } from './local/placesProvider.js';
import { localRouteProvider } from './local/routeProvider.js';

/**
 * @typedef {{ lat: number, lng: number }} Point
 * @typedef {{ km: number, minutes: number }} Leg
 *
 * @typedef {object} RouteMatrix
 * @property {'local'|'google'} provider  source that actually produced the legs
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
 * Google providers fall back to the local ones on any upstream failure, so
 * `provider` in a result can be "local" even when Google is configured.
 */

const apiKey = config.googleMapsApiKey;

export const providerName = apiKey ? 'google' : 'local';

/** @type {RouteProvider} */
export const routeProvider = apiKey
  ? createGoogleRouteProvider({ apiKey, fallback: localRouteProvider })
  : localRouteProvider;

/** @type {PlacesProvider} */
export const placesProvider = apiKey
  ? createGooglePlacesProvider({ apiKey, fallback: localPlacesProvider })
  : localPlacesProvider;
