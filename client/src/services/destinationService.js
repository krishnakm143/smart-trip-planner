import { apiClient } from './apiClient'

export const listDestinations = ({ search, category, page, limit } = {}, signal) =>
  apiClient.get('/destinations', { query: { search, category, page, limit }, signal })

export const getDestination = (slug, signal) =>
  apiClient.get(`/destinations/${encodeURIComponent(slug)}`, { signal })

export const discoverPlaces = (slug, type, signal) =>
  apiClient
    .get(`/destinations/${encodeURIComponent(slug)}/discover`, {
      query: { type },
      signal,
      withMeta: true,
    })
    .then(({ data, meta }) => ({ items: data.items, provider: meta.provider }))
