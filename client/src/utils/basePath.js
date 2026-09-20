// The app is served from "/" locally and from "/<repository>/" on GitHub Pages.
// Vite exposes the configured base as BASE_URL, always with a trailing slash.
const BASE_URL = import.meta.env.BASE_URL

/** Basename for the router: "" at the root, "/smart-trip-planner" under a sub-path. */
export const routerBasename = BASE_URL.replace(/\/$/, '')

/** URL of a file in public/, e.g. withBase('/images/destinations/goa.jpg'). */
export const withBase = (path) => (path.startsWith('/') ? `${BASE_URL}${path.slice(1)}` : path)

/** Router path for a browser pathname, i.e. the pathname without the base. */
export const stripBase = (pathname) =>
  routerBasename && pathname.startsWith(routerBasename)
    ? pathname.slice(routerBasename.length) || '/'
    : pathname
