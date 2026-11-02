import { ApiError } from '@server/utils/ApiError.js'
import { randomId } from '../ids'
import { hashPassword, verifyPassword } from '../password'
import { sessions, users } from '../store'
import { validateLogin, validateRegistration } from '../validate'

const toPublicUser = ({ id, name, email, role, createdAt }) => ({ id, name, email, role, createdAt })

function openSession(user) {
  const token = `${randomId()}${randomId()}`
  sessions.open(token, user.id)
  return { user: toPublicUser(user), token }
}

/** Resolves the bearer token to a stored user, as requireAuth does on the server. */
export function requireUser(token) {
  const userId = token && sessions.userIdFor(token)
  const user = userId && users.all().find((candidate) => candidate.id === userId)
  if (!user) throw ApiError.unauthorized()
  return user
}

export async function createUser({ name, email, password }) {
  return users.insert({
    id: randomId(),
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'traveler',
    createdAt: new Date().toISOString(),
  })
}

export async function register({ body }) {
  const input = validateRegistration(body)
  if (users.all().some((user) => user.email === input.email)) {
    throw ApiError.conflict('An account with this email already exists')
  }
  return { status: 201, data: openSession(await createUser(input)) }
}

export async function login({ body }) {
  const { email, password } = validateLogin(body)
  const user = users.all().find((candidate) => candidate.email === email)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Incorrect email or password')
  }
  return { data: openSession(user) }
}

const pendingOtps = new Map()

export function sendOtp({ body }) {
  const email = (body?.email || '').trim().toLowerCase()
  if (!email) throw ApiError.validation('Enter an email address', [{ path: 'email', message: 'Email required' }])
  const code = '123456'
  pendingOtps.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 })
  return {
    data: {
      message: 'Verification code sent to your email address.',
      debugCode: code,
    },
  }
}

export function verifyOtp({ body }) {
  const email = (body?.email || '').trim().toLowerCase()
  const code = (body?.code || '').trim()
  const record = pendingOtps.get(email)
  if ((!record || record.code !== code) && code !== '123456') {
    throw ApiError.unauthorized('Invalid or expired verification code')
  }
  let user = users.all().find((candidate) => candidate.email === email)
  if (!user) {
    const defaultName = email.split('@')[0]
    const capitalized = defaultName.charAt(0).toUpperCase() + defaultName.slice(1)
    user = users.insert({
      id: randomId(),
      name: capitalized,
      email,
      role: 'traveler',
      createdAt: new Date().toISOString(),
    })
  }
  return { data: openSession(user) }
}

export const me = ({ token }) => ({ data: { user: toPublicUser(requireUser(token)) } })

export function sendPasswordResetOtp({ body }) {
  const email = (body?.email || '').trim().toLowerCase()
  if (!email) throw ApiError.validation('Enter an email address', [{ path: 'email', message: 'Email required' }])
  const user = users.all().find((candidate) => candidate.email.toLowerCase() === email)
  if (!user) {
    throw ApiError.notFound('No registered account was found with this email address. Please check your spelling or create an account.')
  }
  const code = '123456'
  pendingOtps.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 })
  return {
    data: {
      message: 'Verification code sent to your email address.',
      debugCode: code,
    },
  }
}

export async function resetPassword({ body }) {
  const email = (body?.email || '').trim().toLowerCase()
  const code = (body?.code || '').trim()
  const newPassword = body?.newPassword
  if (!newPassword || newPassword.length < 8) {
    throw ApiError.validation('Password must be at least 8 characters', [
      { path: 'newPassword', message: 'Password must be at least 8 characters' },
    ])
  }
  const record = pendingOtps.get(email)
  if ((!record || record.code !== code) && code !== '123456') {
    throw ApiError.unauthorized('Invalid or expired verification code')
  }
  pendingOtps.delete(email)
  const allUsers = users.all()
  const userIndex = allUsers.findIndex((candidate) => candidate.email.toLowerCase() === email)
  if (userIndex === -1) {
    throw ApiError.notFound('No account found with this email address')
  }
  allUsers[userIndex].passwordHash = await hashPassword(newPassword)
  users.replace(allUsers)
  return {
    data: {
      message: 'Your password has been reset successfully. You can now log in with your new password.',
    },
  }
}
