import { describe, expect, it } from 'vitest';
import { haversineKm, roundTo } from '../../src/utils/geo.js';

const delhi = { lat: 28.6139, lng: 77.209 };
const mumbai = { lat: 19.076, lng: 72.8777 };

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(delhi, delhi)).toBe(0);
  });

  it('matches the known Delhi–Mumbai great-circle distance', () => {
    expect(haversineKm(delhi, mumbai)).toBeGreaterThan(1140);
    expect(haversineKm(delhi, mumbai)).toBeLessThan(1160);
  });

  it('is symmetric', () => {
    expect(haversineKm(delhi, mumbai)).toBeCloseTo(haversineKm(mumbai, delhi), 10);
  });
});

describe('roundTo', () => {
  it('rounds to the requested number of decimals', () => {
    expect(roundTo(12.3456, 1)).toBe(12.3);
    expect(roundTo(12.35, 0)).toBe(12);
  });
});
