import { ApiError } from '@server/utils/ApiError.js'
import * as auth from './handlers/auth'
import * as destinations from './handlers/destinations'
import * as expenses from './handlers/expenses'
import * as locations from './handlers/locations'
import * as planner from './handlers/planner'
import * as trips from './handlers/trips'

// The routes the client uses, as mounted in server/src/routes.
const ROUTES = [
  ['POST', '/auth/register', auth.register],
  ['POST', '/auth/login', auth.login],
  ['POST', '/auth/otp/send', auth.sendOtp],
  ['POST', '/auth/otp/verify', auth.verifyOtp],
  ['POST', '/auth/password/reset-otp', auth.sendPasswordResetOtp],
  ['POST', '/auth/password/reset', auth.resetPassword],
  ['GET', '/auth/me', auth.me],
  ['GET', '/destinations', destinations.list],
  ['GET', '/destinations/:slug', destinations.details],
  ['GET', '/destinations/:slug/discover', destinations.discover],
  ['GET', '/locations/nearest', locations.nearest],
  ['POST', '/planner/preview', planner.preview],
  ['POST', '/planner/recommend', planner.recommend],
  ['POST', '/trips', trips.create],
  ['GET', '/trips', trips.list],
  ['GET', '/trips/:id', trips.get],
  ['PATCH', '/trips/:id', trips.update],
  ['DELETE', '/trips/:id', trips.remove],
  ['POST', '/trips/:id/duplicate', trips.duplicate],
  ['POST', '/trips/:id/email', trips.emailTrip],
  ['POST', '/trips/:id/assistant', planner.assistant],
  ['GET', '/trips/:id/expenses', expenses.list],
  ['GET', '/trips/:id/expenses/summary', expenses.summary],
  ['POST', '/trips/:id/expenses', expenses.create],
  ['PATCH', '/trips/:id/expenses/:expenseId', expenses.update],
  ['DELETE', '/trips/:id/expenses/:expenseId', expenses.remove],
]

function matchPath(pattern, path) {
  const expected = pattern.split('/')
  const actual = path.split('/')
  if (expected.length !== actual.length) return null

  const params = {}
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i].startsWith(':')) {
      params[expected[i].slice(1)] = decodeURIComponent(actual[i])
    } else if (expected[i] !== actual[i]) {
      return null
    }
  }
  return params
}

/** Runs the handler for a request and resolves with `{ data, meta?, status? }`. */
export async function dispatch(request) {
  for (const [method, pattern, handler] of ROUTES) {
    const params = method === request.method ? matchPath(pattern, request.path) : null
    if (params) return handler({ ...request, params })
  }
  throw ApiError.notFound(`Route ${request.method} ${request.path} not found`)
}
