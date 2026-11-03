import { apiClient } from './apiClient'

export const listDestinations = ({ search, category, page, limit, includeExternal } = {}, signal) =>
  apiClient.get('/destinations', { query: { search, category, page, limit, includeExternal }, signal })

export const getDestination = (slug, signal) =>
  apiClient.get(`/destinations/${encodeURIComponent(slug)}`, { signal })

export const searchExternalDestinations = (query, signal) =>
  apiClient.get('/destinations/external/search', { query: { q: query }, signal })

export const createDynamicDestination = (destinationData, signal) =>
  apiClient.post('/destinations/dynamic', destinationData, { signal })

export const discoverPlaces = (slug, type, signal) =>
  apiClient
    .get(`/destinations/${encodeURIComponent(slug)}/discover`, {
      query: { type },
      signal,
      withMeta: true,
    })
    .then(({ data, meta }) => ({ items: data.items, provider: meta.provider }))

export const findNearestDestinations = ({ lat, lng, limit = 6 }, signal) =>
  apiClient.get('/locations/nearest', { query: { lat, lng, limit }, signal })
