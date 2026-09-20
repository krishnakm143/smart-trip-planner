import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOsmPlacesProvider } from '../../src/providers/osm/placesProvider.js';
import { createOsmRouteProvider } from '../../src/providers/osm/routeProvider.js';
import { localRouteProvider } from '../../src/providers/local/routeProvider.js';

const manali = {
  id: 'dest1',
  name: 'Manali',
  state: 'Himachal Pradesh',
  location: { lat: 32.2432, lng: 77.1892 },
};
const points = [
  { lat: 32.2483, lng: 77.1806 },
  { lat: 32.3166, lng: 77.157 },
];

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('osm route provider', () => {
  const provider = createOsmRouteProvider({ fallback: localRouteProvider });

  it('maps an OSRM table to legs in km and minutes', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        code: 'Ok',
        distances: [
          [0, 13676.3],
          [13688.8, 0],
        ],
        durations: [
          [0, 1510],
          [1498, 0],
        ],
      }),
    );

    const matrix = await provider.getMatrix(points);

    expect(matrix.provider).toBe('osm');
    expect(matrix.leg(0, 1)).toEqual({ km: 13.7, minutes: 25 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('77.1806,32.2483;77.157,32.3166');
  });

  it('falls back to local estimates when OSRM fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 503));

    const matrix = await provider.getMatrix(points);

    expect(matrix.provider).toBe('local');
    expect(matrix.leg(0, 1).km).toBeGreaterThan(0);
  });

  it('falls back when two points have no road between them', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        code: 'Ok',
        distances: [
          [0, null],
          [null, 0],
        ],
        durations: [
          [0, null],
          [null, 0],
        ],
      }),
    );

    const matrix = await provider.getMatrix(points);

    expect(matrix.provider).toBe('local');
  });
});

describe('osm places provider', () => {
  const fallback = {
    discover: vi.fn(async () => ({
      provider: 'local',
      items: [{ name: 'Seeded' }],
    })),
  };
  const provider = createOsmPlacesProvider({ fallback });

  it('maps Overpass elements, ranks notable places first and removes duplicates', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 32.2523,
            lon: 77.1801,
            tags: { name: 'Wayland viewpoint', tourism: 'viewpoint' },
          },
          {
            type: 'way',
            id: 2,
            center: { lat: 32.112, lon: 77.1 },
            tags: { name: 'Naggar Castle', historic: 'castle', wikidata: 'Q1' },
          },
          {
            type: 'node',
            id: 3,
            lat: 32.2524,
            lon: 77.1802,
            tags: { name: 'Wayland viewpoint', tourism: 'viewpoint' },
          },
          {
            type: 'node',
            id: 4,
            lat: 32.25,
            lon: 77.18,
            tags: { tourism: 'attraction' },
          },
        ],
      }),
    );

    const result = await provider.discover(manali);

    expect(result.provider).toBe('osm');
    expect(result.items.map((item) => item.name)).toEqual(['Naggar Castle', 'Wayland viewpoint']);
    expect(result.items[0]).toEqual({
      name: 'Naggar Castle',
      type: 'culture',
      location: { lat: 32.112, lng: 77.1 },
      rating: null,
      address: 'Manali, Himachal Pradesh',
      externalId: 'osm:way/2',
      source: 'osm',
    });
  });

  it('uses the requested type and sends an Overpass query around the destination', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        elements: [
          {
            type: 'node',
            id: 9,
            lat: 32.24,
            lon: 77.19,
            tags: { name: 'Hadimba Temple', amenity: 'place_of_worship' },
          },
        ],
      }),
    );

    const result = await provider.discover(manali, 'spiritual');

    expect(result.items[0].type).toBe('spiritual');
    const body = decodeURIComponent(fetchMock.mock.calls[0][1].body);
    expect(body).toContain('around:12000,32.2432,77.1892');
    expect(body).toContain('place_of_worship');
  });

  it('reuses a successful answer instead of calling Overpass again', async () => {
    const goa = { ...manali, id: 'dest-cache' };
    fetchMock.mockResolvedValue(
      jsonResponse({
        elements: [
          {
            type: 'node',
            id: 5,
            lat: 15.55,
            lon: 73.75,
            tags: { name: 'Baga Beach', natural: 'beach' },
          },
        ],
      }),
    );

    await provider.discover(goa, 'nature');
    const second = await provider.discover(goa, 'nature');

    expect(second.items[0].name).toBe('Baga Beach');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to local activities on failure or an empty result', async () => {
    const uncached = { ...manali, id: 'dest-uncached' };
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    expect((await provider.discover(uncached)).provider).toBe('local');

    fetchMock.mockResolvedValueOnce(jsonResponse({ elements: [] }));
    expect((await provider.discover(uncached)).provider).toBe('local');
  });
});
