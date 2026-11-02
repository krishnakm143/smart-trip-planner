import { Activity } from '../../models/Activity.js';
import { isDbConnected } from '../../config/db.js';
import { getCatalogueActivities } from '../../services/catalogueService.js';

export const localPlacesProvider = {
  name: 'local',

  async discover(destination, type) {
    let activities = [];

    if (isDbConnected()) {
      try {
        const filter = { destination: destination.id || destination._id };
        if (type) filter.type = type;
        activities = await Activity.find(filter).sort({ rating: -1, name: 1 }).lean();
      } catch {
        // Fallback to catalogue on connection failure
      }
    }

    if (!activities || activities.length === 0) {
      const all = getCatalogueActivities(destination.slug || destination.id);
      activities = type ? all.filter((a) => a.type === type) : all;
    }

    const items = activities.map((activity) => ({
      name: activity.name,
      type: activity.type,
      location: activity.location,
      rating: activity.rating ?? null,
      address: `${destination.name}, ${destination.state}`,
      externalId: activity.externalId ?? null,
      source: activity.source || 'seed',
    }));

    return { provider: 'local', items };
  },
};
