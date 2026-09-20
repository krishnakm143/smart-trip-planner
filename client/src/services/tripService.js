import { apiClient } from './apiClient'

export const createTrip = (planInput) =>
  apiClient.post('/trips', planInput).then((data) => data.trip)

export const listTrips = (status, signal) =>
  apiClient.get('/trips', { query: { status }, signal }).then((data) => data.items)

export const getTrip = (id, signal) =>
  apiClient.get(`/trips/${encodeURIComponent(id)}`, { signal }).then((data) => data.trip)

export const updateTrip = (id, changes) =>
  apiClient.patch(`/trips/${encodeURIComponent(id)}`, changes).then((data) => data.trip)

export const deleteTrip = (id) => apiClient.delete(`/trips/${encodeURIComponent(id)}`)
