/*
 * Stand-in for the REST API on static hosting, where there is no server to call
 * (the GitHub Pages build). It answers the routes the client uses with the same
 * envelope, status codes and messages as server/src, so pages, services and
 * error handling are the same code in both builds.
 *
 * The catalogue, the itinerary generator, the budget estimator and the map
 * providers are imported from the server tree (the "@server" alias). Accounts
 * and trips are kept in this browser's localStorage and never leave it.
 */
import { ApiError } from '@server/utils/ApiError.js'
import { dispatch } from './routes'
import { ready } from './seed'

const API_PREFIX = '/api/v1'

// Long enough for loading states to appear, as they do over a network.
const RESPONSE_DELAY_MS = 150

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const aborted = () => new DOMException('The request was aborted', 'AbortError')

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function errorResponse(error) {
  const known = error instanceof ApiError
  if (!known) console.error(error)

  const { status, code, message, details } = known
    ? error
    : new ApiError('INTERNAL_ERROR', 'Something went wrong. Please try again.')
  return jsonResponse(status, {
    success: false,
    error: details?.length ? { code, message, details } : { code, message },
  })
}

/** Same call signature and result as `fetch`, for the requests apiClient makes. */
export async function browserFetch(url, { method = 'GET', headers = {}, body, signal } = {}) {
  if (signal?.aborted) throw aborted()

  const { pathname, searchParams } = new URL(url, window.location.origin)
  const request = {
    method,
    path: pathname.slice(pathname.indexOf(API_PREFIX) + API_PREFIX.length),
    query: Object.fromEntries(searchParams),
    body: body ? JSON.parse(body) : {},
    token: headers.Authorization?.replace(/^Bearer /, '') ?? null,
  }

  let response
  try {
    await Promise.all([ready(), pause(RESPONSE_DELAY_MS)])
    const { status = 200, data, meta } = await dispatch(request)
    response = jsonResponse(status, meta ? { success: true, data, meta } : { success: true, data })
  } catch (error) {
    response = errorResponse(error)
  }

  if (signal?.aborted) throw aborted()
  return response
}
