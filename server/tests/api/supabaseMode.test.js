import { describe, expect, it } from 'vitest';
import {
  catalogueDestinations,
  catalogueActivities,
  findCatalogueDestination,
  getCatalogueActivities,
  searchCatalogueDestinations,
} from '../../src/services/catalogueService.js';
import * as destinationService from '../../src/services/destinationService.js';
import * as locationService from '../../src/services/locationService.js';

describe('Supabase Mode & In-Memory Catalogue Services', () => {
  it('exposes all curated Indian destinations with deterministic stable IDs', () => {
    expect(catalogueDestinations.length).toBeGreaterThanOrEqual(12);
    for (const dest of catalogueDestinations) {
      expect(dest.id).toBeDefined();
      expect(dest.id).toHaveLength(24);
      expect(dest.name).toBeDefined();
      expect(dest.slug).toBeDefined();
      expect(dest.location?.lat).toBeDefined();
      expect(dest.location?.lng).toBeDefined();
      expect(dest.dailyCost?.economy).toBeDefined();
      expect(dest.dailyCost?.standard).toBeDefined();
      expect(dest.dailyCost?.luxury).toBeDefined();
    }
  });

  it('exposes all curated activities associated with destinations', () => {
    expect(catalogueActivities.length).toBeGreaterThanOrEqual(120);
    for (const act of catalogueActivities) {
      expect(act.id).toBeDefined();
      expect(act.id).toHaveLength(24);
      expect(act.name).toBeDefined();
      expect(act.destination).toBeDefined();
      expect(act.type).toBeDefined();
      expect(act.durationHours).toBeGreaterThan(0);
    }
  });

  it('finds destinations by slug or stable ID', () => {
    const manali = findCatalogueDestination('manali');
    expect(manali).toBeDefined();
    expect(manali.name).toBe('Manali');

    const byId = findCatalogueDestination(manali.id);
    expect(byId).toBeDefined();
    expect(byId.slug).toBe('manali');
  });

  it('retrieves destination activities correctly', () => {
    const activities = getCatalogueActivities('goa');
    expect(activities.length).toBeGreaterThan(0);
    for (const a of activities) {
      expect(a.destinationSlug).toBe('goa');
    }
  });

  it('searches and filters catalogue destinations', () => {
    const searchRes = searchCatalogueDestinations({ search: 'snow', page: 1, limit: 5 });
    expect(searchRes.items.length).toBeGreaterThan(0);
    expect(searchRes.items.some((d) => d.slug === 'manali')).toBe(true);

    const categoryRes = searchCatalogueDestinations({ category: 'beach', page: 1, limit: 5 });
    expect(categoryRes.items.some((d) => d.slug === 'goa')).toBe(true);
  });

  it('destinationService finds destination by stable ID gracefully', async () => {
    const dest = await destinationService.getDestinationById('4a44ab37e1dc8401395ad209');
    expect(dest).toBeDefined();
    expect(dest.slug).toBe('manali');
  });

  it('locationService calculates distance without error', async () => {
    const nearest = await locationService.findNearestDestinations({
      lat: 32.24,
      lng: 77.18,
      limit: 3,
    });
    expect(nearest.items.length).toBe(3);
    expect(nearest.items[0].slug).toBe('manali');
    expect(nearest.items[0].distanceKm).toBeLessThan(10);
  });
});
