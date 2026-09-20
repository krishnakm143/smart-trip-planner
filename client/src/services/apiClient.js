const BASE_URL = '/api/v1'
const TOKEN_KEY = 'stp.token'
const UNREACHABLE_MESSAGE = 'The server is not reachable. Check that the API is running, then try again.'

export class ApiError extends Error {
  constructor({ status, code, message, details = [] }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

let unauthorizedHandler = null

export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

function buildUrl(path, query) {
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  })
  const qs = params.toString()
  return `${BASE_URL}${path}${qs ? `?${qs}` : ''}`
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Resolves with the envelope's `data`. Pass `withMeta: true` to receive
 * `{ data, meta }` for endpoints that report which provider answered.
 */
async function request(path, { method = 'GET', body, query, signal, withMeta = false } = {}) {
  const token = tokenStore.get()
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    if (cause.name === 'AbortError') throw cause
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: UNREACHABLE_MESSAGE })
  }

  const payload = await readJson(response)

  // The dev proxy answers with an empty 5xx when nothing is listening behind it.
  if (!payload && response.status >= 500) {
    throw new ApiError({ status: response.status, code: 'NETWORK_ERROR', message: UNREACHABLE_MESSAGE })
  }

  if (!response.ok || !payload?.success) {
    if (response.status === 401 && token) {
      tokenStore.clear()
      unauthorizedHandler?.()
    }
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? 'INTERNAL_ERROR',
      message: payload?.error?.message ?? 'The server returned an unexpected response.',
      details: payload?.error?.details,
    })
  }

  return withMeta ? { data: payload.data, meta: payload.meta ?? {} } : payload.data
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
