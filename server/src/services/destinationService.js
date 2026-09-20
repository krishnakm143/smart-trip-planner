import { Activity } from '../models/Activity.js';
import { Destination } from '../models/Destination.js';
import { placesProvider } from '../providers/index.js';
import { ApiError } from '../utils/ApiError.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listDestinations({ search, category, page, limit }) {
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

  return { items, total, page, limit };
}

export async function getDestinationById(id) {
  const destination = await Destination.findById(id);
  if (!destination) throw ApiError.notFound('Destination not found');
  return destination;
}

async function getDestinationBySlug(slug) {
  const destination = await Destination.findOne({ slug });
  if (!destination) throw ApiError.notFound('Destination not found');
  return destination;
}

export async function getDestinationDetails(slug) {
  const destination = await getDestinationBySlug(slug);
  const activities = await Activity.find({ destination: destination.id }).sort({
    rating: -1,
    name: 1,
  });
  return { destination, activities };
}

export async function discoverPlaces(slug, type) {
  const destination = await getDestinationBySlug(slug);
  return placesProvider.discover(destination, type);
}
