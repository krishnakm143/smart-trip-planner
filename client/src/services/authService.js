import { apiClient } from './apiClient'

export const register = (credentials) => apiClient.post('/auth/register', credentials)

export const login = (credentials) => apiClient.post('/auth/login', credentials)

export const sendOtp = (email) => apiClient.post('/auth/otp/send', { email })

export const verifyOtp = ({ email, code }) => apiClient.post('/auth/otp/verify', { email, code })

export const sendPasswordResetOtp = (email) => apiClient.post('/auth/password/reset-otp', { email })

export const resetPasswordWithOtp = ({ email, code, newPassword }) =>
  apiClient.post('/auth/password/reset', { email, code, newPassword })

export const fetchCurrentUser = (signal) =>
  apiClient.get('/auth/me', { signal }).then((data) => data.user)
