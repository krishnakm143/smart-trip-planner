import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGooglePlacesProvider } from '../../src/providers/google/placesProvider.js';
import { createGoogleRouteProvider } from '../../src/providers/google/routeProvider.js';
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

const jsonResponse = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

const element = (metres, seconds) => ({
  status: 'OK',
  distance: { value: metres },
  duration: { value: seconds },
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

describe('google route provider', () => {
  const provider = createGoogleRouteProvider({ apiKey: 'test-key', fallback: localRouteProvider });

  it('maps a Distance Matrix response into legs with a single request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'OK',
        rows: [
          { elements: [element(0, 0), element(13240, 1560)] },
          { elements: [element(13100, 1500), element(0, 0)] },
        ],
      }),
    );

    const matrix = await provider.getMatrix(points);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/maps/api/distancematrix/json');
    expect(url.searchParams.get('origins')).toBe('32.2483,77.1806|32.3166,77.157');
    expect(url.searchParams.get('key')).toBe('test-key');

    expect(matrix.provider).toBe('google');
    expect(matrix.leg(0, 1)).toEqual({ km: 13.2, minutes: 26 });
    expect(matrix.leg(1, 0)).toEqual({ km: 13.1, minutes: 25 });
  });

  it('splits large matrices so no request exceeds 100 elements', async () => {
    const manyPoints = Array.from({ length: 12 }, (_, i) => ({ lat: 32 + i / 100, lng: 77 }));
    fetchMock.mockImplementation(async (url) => {
      const origins = new URL(url).searchParams.get('origins').split('|');
      return jsonResponse({
        status: 'OK',
        rows: origins.map(() => ({ elements: manyPoints.map(() => element(1000, 120)) })),
      });
    });

    const matrix = await provider.getMatrix(manyPoints);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(matrix.leg(11, 0)).toEqual({ km: 1, minutes: 2 });
  });

  it.each([
    ['a network error', () => Promise.reject(new Error('getaddrinfo ENOTFOUND'))],
    ['an HTTP error', () => Promise.resolve(jsonResponse({}, false, 500))],
    ['a denied request', () => Promise.resolve(jsonResponse({ status: 'REQUEST_DENIED' }))],
    [
      'an unroutable element',
      () =>
        Promise.resolve(
          jsonResponse({
            status: 'OK',
            rows: [
              { elements: [element(0, 0), { status: 'ZERO_RESULTS' }] },
              { elements: [element(1, 1), element(0, 0)] },
            ],
          }),
        ),
    ],
  ])('falls back to local estimates on %s', async (_label, respond) => {
    fetchMock.mockImplementation(respond);

    const matrix = await provider.getMatrix(points);
    const local = await localRouteProvider.getMatrix(points);

    expect(matrix.provider).toBe('local');
    expect(matrix.leg(0, 1)).toEqual(local.leg(0, 1));
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('falls back when the request exceeds the timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );

    const pending = provider.getMatrix(points);
    await vi.advanceTimersByTimeAsync(4000);
    const matrix = await pending;
    vi.useRealTimers();

    expect(matrix.provider).toBe('local');
  });

  it('answers getLeg from a two-point matrix', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'OK',
        rows: [
          { elements: [element(0, 0), element(5000, 600)] },
          { elements: [element(5000, 600), element(0, 0)] },
        ],
      }),
    );

    expect(await provider.getLeg(points[0], points[1])).toEqual({ km: 5, minutes: 10 });
  });
});

describe('google places provider', () => {
  const localResult = { provider: 'local', items: [{ name: 'Seeded place', source: 'seed' }] };
  const fallback = { discover: vi.fn(async () => localResult) };
  const provider = createGooglePlacesProvider({ apiKey: 'test-key', fallback });

  it('sends a text search and maps places to the shared shape', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        places: [
          {
            id: 'ChIJ-hadimba',
            displayName: { text: 'Hidimba Devi Temple' },
            formattedAddress: 'Hadimba Temple Rd, Manali, Himachal Pradesh 175131',
            location: { latitude: 32.2483, longitude: 77.1806 },
            rating: 4.6,
            types: ['hindu_temple', 'tourist_attraction', 'place_of_worship'],
          },
          {
            id: 'ChIJ-mall',
            displayName: { text: 'Mall Road' },
            location: { latitude: 32.2433, longitude: 77.189 },
            types: ['tourist_attraction', 'point_of_interest'],
          },
        ],
      }),
    );

    const result = await provider.discover(manali);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Goog-Api-Key']).toBe('test-key');
    expect(options.headers['X-Goog-FieldMask']).toContain('places.displayName');
    expect(JSON.parse(options.body).textQuery).toBe('tourist attractions in Manali, Himachal Pradesh');

    expect(result.provider).toBe('google');
    expect(result.items).toEqual([
      {
        name: 'Hidimba Devi Temple',
        type: 'spiritual',
        location: { lat: 32.2483, lng: 77.1806 },
        rating: 4.6,
        address: 'Hadimba Temple Rd, Manali, Himachal Pradesh 175131',
        externalId: 'ChIJ-hadimba',
        source: 'google',
      },
      {
        name: 'Mall Road',
        type: 'sightseeing',
        location: { lat: 32.2433, lng: 77.189 },
        rating: null,
        address: '',
        externalId: 'ChIJ-mall',
        source: 'google',
      },
    ]);
  });

  it('tailors the query to the requested type and uses it for unmapped places', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        places: [
          {
            id: 'ChIJ-raft',
            displayName: { text: 'Beas River Rafting Point' },
            location: { latitude: 32.1, longitude: 77.13 },
            types: ['point_of_interest'],
          },
        ],
      }),
    );

    const result = await provider.discover(manali, 'adventure');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).textQuery).toBe(
      'adventure activities in Manali, Himachal Pradesh',
    );
    expect(result.items[0].type).toBe('adventure');
  });

  it('returns an empty list when Google has no results', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    expect(await provider.discover(manali)).toEqual({ provider: 'google', items: [] });
  });

  it('falls back to local activities when the request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { status: 'PERMISSION_DENIED' } }, false, 403));

    const result = await provider.discover(manali, 'nature');

    expect(result).toBe(localResult);
    expect(fallback.discover).toHaveBeenCalledWith(manali, 'nature');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
