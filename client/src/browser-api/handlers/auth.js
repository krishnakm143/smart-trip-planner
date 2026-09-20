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

export const me = ({ token }) => ({ data: { user: toPublicUser(requireUser(token)) } })
