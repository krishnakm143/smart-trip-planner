import { activitiesBySlug } from '../seed/activities.js';
import { destinations as seedDestinations } from '../seed/destinations.js';
import { stableId } from '../utils/ids.js';

const cost = (stay, food, transport) => ({ stay, food, transport });

export const catalogueDestinations = Object.freeze(
  seedDestinations.map((dest) => ({
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
  })),
);

export const catalogueActivities = Object.freeze(
  catalogueDestinations.flatMap((dest) =>
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
  ),
);

const dynamicCatalogueDestinations = [];
const dynamicCatalogueActivities = [];

const byRatingThenName = (a, b) => b.rating - a.rating || a.name.localeCompare(b.name);

export function getAllCatalogueDestinations() {
  return [...catalogueDestinations, ...dynamicCatalogueDestinations];
}

export function getCatalogueDestinations() {
  return getAllCatalogueDestinations().sort(byRatingThenName);
}

export function findCatalogueDestination(idOrSlug) {
  if (!idOrSlug) return null;
  const all = getAllCatalogueDestinations();
  return (
    all.find(
      (d) => d.id === idOrSlug || d._id === idOrSlug || d.slug === idOrSlug,
    ) ?? null
  );
}

export function getCatalogueActivities(destIdOrSlug) {
  const dest = findCatalogueDestination(destIdOrSlug);
  if (!dest) return [];
  const allActs = [...catalogueActivities, ...dynamicCatalogueActivities];
  return allActs
    .filter((a) => a.destination === dest.id || a.destinationSlug === dest.slug)
    .sort(byRatingThenName);
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function searchCatalogueDestinations({ search, category, page = 1, limit = 12 }) {
  let list = getAllCatalogueDestinations();
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

export function addCatalogueDestination(dest) {
  const destId = dest.id || dest._id || stableId(`destination:${dest.slug}`);
  const existingIndex = dynamicCatalogueDestinations.findIndex(
    (d) => d.slug === dest.slug || d.id === destId || d._id === destId,
  );
  const normalized = {
    ...dest,
    id: destId,
    _id: destId,
    dailyCost: {
      economy: cost(dest.dailyCost.economy.stay, dest.dailyCost.economy.food, dest.dailyCost.economy.transport),
      standard: cost(dest.dailyCost.standard.stay, dest.dailyCost.standard.food, dest.dailyCost.standard.transport),
      luxury: cost(dest.dailyCost.luxury.stay, dest.dailyCost.luxury.food, dest.dailyCost.luxury.transport),
    },
    toJSON() {
      return { ...this };
    },
  };

  if (existingIndex >= 0) {
    dynamicCatalogueDestinations[existingIndex] = normalized;
  } else {
    dynamicCatalogueDestinations.push(normalized);
  }
  return normalized;
}

export function addCatalogueActivities(activities = []) {
  activities.forEach((act) => {
    const destSlug = act.destinationSlug || act.slug || 'custom';
    const actId = act.id || act._id || stableId(`activity:${destSlug}:${act.name}`);
    const existingIndex = dynamicCatalogueActivities.findIndex(
      (a) => a.id === actId || (a.destinationSlug === destSlug && a.name === act.name),
    );
    const normalized = {
      ...act,
      id: actId,
      _id: actId,
      destination: act.destination || stableId(`destination:${destSlug}`),
      destinationSlug: destSlug,
      source: act.source || 'external',
      toJSON() {
        return { ...this };
      },
    };
    if (existingIndex >= 0) {
      dynamicCatalogueActivities[existingIndex] = normalized;
    } else {
      dynamicCatalogueActivities.push(normalized);
    }
  });
}

export function clearDynamicCatalogue() {
  dynamicCatalogueDestinations.length = 0;
  dynamicCatalogueActivities.length = 0;
}
