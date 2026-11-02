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

export const duplicateTrip = (id) =>
  apiClient.post(`/trips/${encodeURIComponent(id)}/duplicate`).then((data) => data.trip)

export const listExpenses = (tripId, signal) =>
  apiClient.get(`/trips/${encodeURIComponent(tripId)}/expenses`, { signal }).then((data) => data.items)

export const createExpense = (tripId, expense) =>
  apiClient.post(`/trips/${encodeURIComponent(tripId)}/expenses`, expense).then((data) => data.expense)

export const updateExpense = (tripId, expenseId, changes) =>
  apiClient
    .patch(`/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`, changes)
    .then((data) => data.expense)

export const deleteExpense = (tripId, expenseId) =>
  apiClient.delete(`/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`)

export const getExpenseSummary = (tripId, signal) =>
  apiClient.get(`/trips/${encodeURIComponent(tripId)}/expenses/summary`, { signal })

export const askTripAssistant = (tripId, question) =>
  apiClient
    .post(`/trips/${encodeURIComponent(tripId)}/assistant`, { question })
    .then((data) => data.answer)

export const recommendDestinations = (criteria) =>
  apiClient.post('/planner/recommend', criteria).then((data) => data.recommendations)

export const emailTripPlan = (id, email) =>
  apiClient.post(`/trips/${encodeURIComponent(id)}/email`, { email }).then((data) => data.message)

export const sendOtp = (email) =>
  apiClient.post('/auth/otp/send', { email })

export const verifyOtp = (email, code) =>
  apiClient.post('/auth/otp/verify', { email, code })
