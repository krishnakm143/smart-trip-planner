import { validateEmailSecurity } from '@server/utils/emailValidator.js'

export function validateLogin({ email, password }) {
  const errors = {}
  const emailRes = validateEmailSecurity(email)
  if (!emailRes.valid) errors.email = emailRes.message
  if (!password) errors.password = 'Enter your password.'
  return errors
}

export function validateRegistration({ name, email, password }) {
  const errors = {}
  const trimmedName = (name || '').trim()
  if (trimmedName.length < 2 || trimmedName.length > 60) errors.name = 'Your name should be 2 to 60 characters.'
  const emailRes = validateEmailSecurity(email)
  if (!emailRes.valid) errors.email = emailRes.message
  if (!password || password.length < 8) {
    errors.password = 'Use at least 8 characters.'
  } else if (password.trim().length < 8) {
    errors.password = 'Password cannot consist only of whitespace.'
  }
  return errors
}
