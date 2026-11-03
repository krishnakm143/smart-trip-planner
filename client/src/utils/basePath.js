// The app is served from "/" locally and from "/<repository>/" on GitHub Pages.
// Vite exposes the configured base as BASE_URL, always with a trailing slash.
const BASE_URL = import.meta.env.BASE_URL

/** Basename for the router: "" at the root, "/smart-trip-planner" under a sub-path. */
export const routerBasename = BASE_URL.replace(/\/$/, '')

/** URL of a file in public/ or API photo endpoint, e.g. withBase('/images/destinations/goa.jpg'). */
export const withBase = (path) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  if (path.startsWith('/api/v1')) {
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1'
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      return path.replace(/^\/api\/v1/, apiUrl)
    }
    return path
  }
  return path.startsWith('/') ? `${BASE_URL}${path.slice(1)}` : path
}

/** Router path for a browser pathname, i.e. the pathname without the base. */
export const stripBase = (pathname) =>
  routerBasename && pathname.startsWith(routerBasename)
    ? pathname.slice(routerBasename.length) || '/'
    : pathname
