import { activitiesOf, addDestination, allDestinations, findDestinationBySlug } from '../catalogue'
import { placesProvider } from '../providers'
import { validateDestinationQuery, validatePlaceType } from '../validate'

export function list({ query }) {
  const { search, category, page, limit } = validateDestinationQuery(query)
  const term = search.toLowerCase()
  const matches = (value) => value.toLowerCase().includes(term)

  const found = allDestinations().filter(
    (destination) =>
      (!category || destination.category === category) &&
      (!term ||
        [destination.name, destination.state, destination.tagline, ...(destination.tags || [])].some(matches)),
  )

  const start = (page - 1) * limit
  return { data: { items: found.slice(start, start + limit), total: found.length, page, limit } }
}

export function details({ params }) {
  const destination = findDestinationBySlug(params.slug)
  return { data: { destination, activities: activitiesOf(destination.id) } }
}

export async function discover({ params, query }) {
  const destination = findDestinationBySlug(params.slug)
  const { items, provider } = await placesProvider.discover(destination, validatePlaceType(query))
  return { data: { items }, meta: { provider } }
}

export function searchExternal({ query }) {
  const q = String(query?.q || '').toLowerCase().trim()
  const items = allDestinations()
    .filter((d) => d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q) || (d.tags || []).some((t) => t.includes(q)))
  return { data: { items } }
}

export function createDynamic({ body }) {
  const destination = addDestination(body)
  return { data: { destination } }
}
