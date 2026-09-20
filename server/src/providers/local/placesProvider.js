import { Activity } from '../../models/Activity.js';

export const localPlacesProvider = {
  name: 'local',

  async discover(destination, type) {
    const filter = { destination: destination.id };
    if (type) filter.type = type;

    const activities = await Activity.find(filter).sort({ rating: -1, name: 1 }).lean();
    const items = activities.map((activity) => ({
      name: activity.name,
      type: activity.type,
      location: activity.location,
      rating: activity.rating ?? null,
      address: `${destination.name}, ${destination.state}`,
      externalId: activity.externalId ?? null,
      source: activity.source,
    }));

    return { provider: 'local', items };
  },
};
