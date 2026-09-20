import { apiClient } from './apiClient'

export const register = (credentials) => apiClient.post('/auth/register', credentials)

export const login = (credentials) => apiClient.post('/auth/login', credentials)

export const fetchCurrentUser = (signal) =>
  apiClient.get('/auth/me', { signal }).then((data) => data.user)
