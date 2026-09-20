import { localRouteProvider } from '@server/providers/local/routeProvider.js'
import { createOsmPlacesProvider } from '@server/providers/osm/placesProvider.js'
import { createOsmRouteProvider } from '@server/providers/osm/routeProvider.js'
import { activitiesOf } from './catalogue'

// Counterpart of server/src/providers/local/placesProvider.js over the in-memory catalogue.
const localPlacesProvider = {
  name: 'local',

  async discover(destination, type) {
    const items = activitiesOf(destination.id)
      .filter((activity) => !type || activity.type === type)
      .map((activity) => ({
        name: activity.name,
        type: activity.type,
        location: activity.location,
        rating: activity.rating ?? null,
        address: `${destination.name}, ${destination.state}`,
        externalId: null,
        source: activity.source,
      }))

    return { provider: 'local', items }
  },
}

// OSRM and Overpass both answer cross-origin requests. A browser may not send a
// custom User-Agent on those, so the providers are created without one.
const useOsm = import.meta.env.VITE_MAPS_PROVIDER === 'osm'

export const routeProvider = useOsm
  ? createOsmRouteProvider({ fallback: localRouteProvider, headers: {} })
  : localRouteProvider

export const placesProvider = useOsm
  ? createOsmPlacesProvider({ fallback: localPlacesProvider, headers: {} })
  : localPlacesProvider

export { localRouteProvider }
