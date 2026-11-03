import { activitiesBySlug } from '../seed/activities.js';
import { destinations as seedDestinations } from '../seed/destinations.js';
import { stableId } from '../utils/ids.js';
import { CURATED_REGIONAL_ACTIVITIES } from '../providers/dynamicDestinationProvider.js';

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
  const found = allActs
    .filter((a) => a.destination === dest.id || a.destinationSlug === dest.slug)
    .sort(byRatingThenName);
  if (found.length > 0) return found;

  const regional = CURATED_REGIONAL_ACTIVITIES[dest.slug];
  if (regional && regional.length > 0) {
    const acts = regional.map((act) => ({
      id: stableId(`activity:${dest.slug}:${act.name}`),
      _id: stableId(`activity:${dest.slug}:${act.name}`),
      destination: dest.id || dest._id,
      destinationSlug: dest.slug,
      ...act,
      source: 'curated-dynamic',
      toJSON() {
        return { ...this };
      },
    }));
    addCatalogueActivities(acts);
    return acts.sort(byRatingThenName);
  }

  if (dest.location?.lat && dest.location?.lng) {
    const lat = Number(dest.location.lat);
    const lng = Number(dest.location.lng);
    const defaults = [
      {
        name: `${dest.name} Historic Old Town & Heritage Sights`,
        type: 'culture',
        description: `Explore the celebrated historic quarters, architectural landmarks, and cultural heritage of ${dest.name}.`,
        location: { lat: lat + 0.003, lng: lng - 0.002 },
        durationHours: 2.5,
        entryFee: 50,
        rating: 4.7,
        bestTime: 'morning',
      },
      {
        name: `${dest.name} Scenic Promenade & Central Gardens`,
        type: 'nature',
        description: `Stroll through the scenic gardens, promenades, and picturesque viewpoints in the heart of ${dest.name}.`,
        location: { lat: lat - 0.004, lng: lng + 0.003 },
        durationHours: 2,
        entryFee: 0,
        rating: 4.6,
        bestTime: 'evening',
      },
      {
        name: `${dest.name} Vibrant Cultural Bazaar & Markets`,
        type: 'sightseeing',
        description: `Experience the bustling local crafts, street flavors, and authentic artisan bazaars of ${dest.name}.`,
        location: { lat: lat + 0.002, lng: lng + 0.004 },
        durationHours: 2,
        entryFee: 0,
        rating: 4.5,
        bestTime: 'afternoon',
      },
    ].map((act) => ({
      id: stableId(`activity:${dest.slug}:${act.name}`),
      _id: stableId(`activity:${dest.slug}:${act.name}`),
      destination: dest.id || dest._id,
      destinationSlug: dest.slug,
      ...act,
      source: 'external',
      toJSON() {
        return { ...this };
      },
    }));
    addCatalogueActivities(defaults);
    return defaults.sort(byRatingThenName);
  }

  return [];
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
