import { Activity } from '../models/Activity.js';
import { Destination } from '../models/Destination.js';
import { isDbConnected } from '../config/db.js';
import { config } from '../config/env.js';
import { placesProvider } from '../providers/index.js';
import { searchExternalDestinations } from '../providers/dynamicDestinationProvider.js';
import { ApiError } from '../utils/ApiError.js';
import {
  addCatalogueActivities,
  addCatalogueDestination,
  findCatalogueDestination,
  getCatalogueActivities,
  searchCatalogueDestinations,
} from './catalogueService.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export { searchExternalDestinations };

export async function listDestinations({ search, category, page = 1, limit = 12 }) {
  let result;
  if (!isDbConnected()) {
    result = searchCatalogueDestinations({ search, category, page, limit });
  } else {
    const filter = {};
    if (category) filter.category = category;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { state: pattern }, { tags: pattern }, { tagline: pattern }];
    }

    const [items, total] = await Promise.all([
      Destination.find(filter)
        .sort({ rating: -1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Destination.countDocuments(filter),
    ]);

    result = { items, total, page, limit };
  }

  // If search query is provided and user requested external discovery or no local results were found
  if (search && search.trim().length >= 2 && !config.isTest) {
    try {
      const externalMatches = await searchExternalDestinations(search);
      if (externalMatches && externalMatches.length > 0) {
        const importedList = await Promise.all(
          externalMatches.slice(0, 4).map(async (match) => {
            try {
              return await importDynamicDestination(match);
            } catch {
              return match;
            }
          }),
        );

        const existingSlugs = new Set(result.items.map((i) => i.slug));
        const newItems = [];
        for (const item of importedList) {
          if (item && !existingSlugs.has(item.slug)) {
            newItems.push(item);
            existingSlugs.add(item.slug);
          }
        }

        if (newItems.length > 0) {
          result.items = [...result.items, ...newItems];
          result.total = result.total + newItems.length;
        }
        result.externalMatches = externalMatches;
      }
    } catch {
      // Ignore external provider errors
    }
  }

  return result;
}

export async function importDynamicDestination(input) {
  if (!input) {
    throw ApiError.badRequest('Destination data or query is required');
  }

  let data = input;
  if (typeof input === 'string' || (input.query && !input.name)) {
    const query = typeof input === 'string' ? input : input.query;
    const candidates = await searchExternalDestinations(query);
    if (!candidates || candidates.length === 0) {
      throw ApiError.notFound(`No external destination found for "${query}"`);
    }
    data = candidates[0];
  }

  if (!data.name || !data.slug || !data.location?.lat || !data.location?.lng) {
    throw ApiError.badRequest('Incomplete destination payload');
  }

  // Check if destination already exists by slug or name
  let existing = null;
  if (isDbConnected()) {
    existing = await Destination.findOne({
      $or: [{ slug: data.slug }, { name: new RegExp(`^${escapeRegex(data.name)}$`, 'i') }],
    });
  }
  if (!existing) {
    existing = findCatalogueDestination(data.slug) || findCatalogueDestination(data.name.toLowerCase());
  }

  if (existing) {
    return existing;
  }

  const destinationDoc = {
    name: data.name,
    slug: data.slug,
    state: data.state || 'Region',
    country: data.country || 'India',
    category: data.category || 'heritage',
    tagline: data.tagline || `Discover the captivating sights and heritage of ${data.name}`,
    description: data.description || `${data.name} is a premier travel destination featuring historic landmarks, natural beauty, and rich local culture.`,
    heroImage: data.heroImage || 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
    location: {
      lat: Number(data.location.lat),
      lng: Number(data.location.lng),
    },
    bestSeason: data.bestSeason || 'October – March',
    idealDays: data.idealDays || { min: 2, max: 4 },
    dailyCost: data.dailyCost || {
      economy: { stay: 1200, food: 500, transport: 400 },
      standard: { stay: 3000, food: 900, transport: 800 },
      luxury: { stay: 8500, food: 2200, transport: 2000 },
    },
    rating: data.rating ? Math.min(5, Math.max(0, Number(data.rating))) : 4.5,
    tags: Array.isArray(data.tags) ? data.tags : [data.category || 'heritage', 'travel', data.slug],
  };

  let saved;
  if (isDbConnected()) {
    saved = await Destination.create(destinationDoc);
  } else {
    saved = addCatalogueDestination(destinationDoc);
  }

  // Sync to catalogue cache as well
  addCatalogueDestination(saved);

  // Discover and link initial places/activities via placesProvider
  try {
    const { items } = await placesProvider.discover(saved, 'sightseeing');
    if (items && items.length > 0) {
      const acts = items.map((p, idx) => ({
        destination: saved._id || saved.id,
        destinationSlug: saved.slug,
        name: p.name,
        type: p.type || 'culture',
        description: p.address ? `${p.name} located at ${p.address}.` : `A popular landmark in ${saved.name}.`,
        location: p.location,
        durationHours: 2,
        entryFee: p.type === 'heritage' || p.type === 'culture' ? 50 : 0,
        rating: p.rating || 4.5,
        bestTime: idx % 3 === 0 ? 'morning' : (idx % 3 === 1 ? 'afternoon' : 'evening'),
        source: p.source === 'google' ? 'google' : 'osm',
        externalId: p.externalId,
      }));

      if (isDbConnected()) {
        await Activity.insertMany(acts).catch(() => {});
      }
      addCatalogueActivities(acts);
    }
  } catch {
    // If places lookup fails, destination remains plannable with default activities
  }

  return saved;
}

export async function getDestinationById(id) {
  if (isDbConnected()) {
    try {
      const destination = await Destination.findById(id);
      if (destination) return destination;
    } catch {
      // Cast error or not an ObjectId; fallback to catalog lookup below
    }
  }

  const fallback = findCatalogueDestination(id);
  if (fallback) return fallback;

  // Try resolving by slug if id is a slug string
  if (typeof id === 'string' && !config.isTest) {
    try {
      const dynamic = await getDestinationBySlug(id);
      if (dynamic) return dynamic;
    } catch {
      // not found
    }
  }

  throw ApiError.notFound('Destination not found');
}

export async function getDestinationBySlug(slug) {
  if (isDbConnected()) {
    const destination = await Destination.findOne({ slug });
    if (destination) return destination;
  }

  const fallback = findCatalogueDestination(slug);
  if (fallback) return fallback;

  // If not found in test mode, immediately return 404
  if (config.isTest) {
    throw ApiError.notFound('Destination not found');
  }

  // Dynamically attempt to find and import destination from external API
  try {
    const imported = await importDynamicDestination(slug);
    if (imported) return imported;
  } catch {
    // Fall through to 404
  }

  throw ApiError.notFound('Destination not found');
}

export async function getDestinationDetails(slug) {
  const destination = await getDestinationBySlug(slug);

  if (!isDbConnected()) {
    const activities = getCatalogueActivities(destination.slug || slug);
    return { destination, activities };
  }

  const activities = await Activity.find({ destination: destination.id || destination._id }).sort({
    rating: -1,
    name: 1,
  });
  return { destination, activities: activities.length > 0 ? activities : getCatalogueActivities(slug) };
}

export async function discoverPlaces(slug, type) {
  const destination = await getDestinationBySlug(slug);
  return placesProvider.discover(destination, type);
}
