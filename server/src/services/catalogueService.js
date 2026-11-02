import { activitiesBySlug } from '../seed/activities.js';
import { destinations as seedDestinations } from '../seed/destinations.js';
import { stableId } from '../utils/ids.js';

const cost = (stay, food, transport) => ({ stay, food, transport });

export const catalogueDestinations = seedDestinations.map((dest) => ({
  id: stableId(`destination:${dest.slug}`),
  _id: stableId(`destination:${dest.slug}`),
  ...dest,
  dailyCost: {
    economy: cost(dest.dailyCost.economy.stay, dest.dailyCost.economy.food, dest.dailyCost.economy.transport),
    standard: cost(dest.dailyCost.standard.stay, dest.dailyCost.standard.food, dest.dailyCost.standard.transport),
    luxury: cost(dest.dailyCost.luxury.stay, dest.dailyCost.luxury.food, dest.dailyCost.luxury.transport),
  },
  toJSON() {
    return { ...this };
  },
}));

export const catalogueActivities = catalogueDestinations.flatMap((dest) =>
  (activitiesBySlug[dest.slug] || []).map((act) => ({
    id: stableId(`activity:${dest.slug}:${act.name}`),
    _id: stableId(`activity:${dest.slug}:${act.name}`),
    destination: dest.id,
    destinationSlug: dest.slug,
    ...act,
    source: 'seed',
    toJSON() {
      return { ...this };
    },
  })),
);

const byRatingThenName = (a, b) => b.rating - a.rating || a.name.localeCompare(b.name);

export function getCatalogueDestinations() {
  return [...catalogueDestinations].sort(byRatingThenName);
}

export function findCatalogueDestination(idOrSlug) {
  if (!idOrSlug) return null;
  return (
    catalogueDestinations.find(
      (d) => d.id === idOrSlug || d._id === idOrSlug || d.slug === idOrSlug,
    ) ?? null
  );
}

export function getCatalogueActivities(destIdOrSlug) {
  const dest = findCatalogueDestination(destIdOrSlug);
  if (!dest) return [];
  return catalogueActivities
    .filter((a) => a.destination === dest.id || a.destinationSlug === dest.slug)
    .sort(byRatingThenName);
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function searchCatalogueDestinations({ search, category, page = 1, limit = 12 }) {
  let list = catalogueDestinations;
  if (category) {
    list = list.filter((d) => d.category === category);
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    list = list.filter(
      (d) =>
        rx.test(d.name) ||
        rx.test(d.state) ||
        rx.test(d.tagline) ||
        (Array.isArray(d.tags) && d.tags.some((t) => rx.test(t))),
    );
  }

  const sorted = [...list].sort(byRatingThenName);
  const total = sorted.length;
  const items = sorted.slice((page - 1) * limit, page * limit);

  return { items, total, page, limit };
}
